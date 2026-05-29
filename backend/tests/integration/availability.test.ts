import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";

// ─── Handlers ─────────────────────────────────────────────────────────────────
import { listAvailabilityRules } from "../../src/routes/v1/availability/list-rules.js";
import { createAvailabilityRules } from "../../src/routes/v1/availability/update-rules.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROF_ID = "prof-123";
const VALID_USER_ID = "legit-user-id";

/**
 * Set up Viper mocks so BOTH authPlugin and handlers work.
 *
 * authPlugin needs:  from('professionals').select().eq('auth_user_id', ...).single()
 * list handler needs: from('availability_rules').select().eq('professional_id', ...).order(...).order(...)
 * create handler needs: from('availability_rules').insert(...).select()
 *
 * The mock dispatches on table name to return the right chain.
 */
function setupMocks(overrides?: {
  authFrom?: (table: string) => any;
  listData?: any[];
  insertData?: any;
}) {
  const authFrom =
    overrides?.authFrom ||
    ((table: string) => {
      if (table === "professionals") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { id: PROF_ID }, error: null }),
            }),
          }),
        };
      }
      // Default for availability_rules: list returns empty, insert fails
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => Promise.resolve({ data: null, error: { message: "no mock" } }),
        }),
      } as any;
    });

  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: VALID_USER_ID } } as any,
    error: null,
  });

  vi.spyOn(supabase, "from").mockImplementation(authFrom);
}

async function buildTestApp() {
  const fastify = Fastify({ logger: false });
  await fastify.register(authPlugin);

  fastify.get(
    "/v1/professionals/:id/availability",
    adaptHandler(listAvailabilityRules),
  );
  fastify.post(
    "/v1/professionals/:id/availability",
    adaptHandler(createAvailabilityRules),
  );

  await fastify.ready();
  return fastify;
}

afterEach(() => vi.restoreAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Availability Rules — list", () => {
  it("listAvailabilityRules — success 200 OK", async () => {
    const mockRules = [
      { day_of_week: 1, start_time: "09:00", end_time: "18:00" },
    ];

    setupMocks({
      listData: mockRules,
      authFrom: (table: string) => {
        if (table === "professionals") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { id: PROF_ID }, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockRules, error: null }),
              }),
            }),
          }),
        } as any;
      },
    });

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: { authorization: "Bearer valid-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockRules);
  });
});

describe("Availability Rules — update", () => {
  it("createAvailabilityRule — success 201 Created", async () => {
    const newRule = { day_of_week: 2, start_time: "10:00", end_time: "19:00" };
    const savedRule = { id: "rule-1", ...newRule, professional_id: PROF_ID };

    setupMocks({
      insertData: savedRule,
      authFrom: (table: string) => {
        if (table === "professionals") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { id: PROF_ID }, error: null }),
              }),
            }),
          };
        }
        return {
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
          insert: () => ({
            select: () => Promise.resolve({ data: [savedRule], error: null }),
          }),
        } as any;
      },
    });

    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: newRule,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].day_of_week).toBe(2);
  });

  it("createAvailabilityRule — conflito interno retorna 409", async () => {
    setupMocks(); // basic auth mock + empty list

    const overlappingRules = [
      { day_of_week: 1, start_time: "09:00", end_time: "12:00" },
      { day_of_week: 1, start_time: "11:00", end_time: "14:00" }, // overlaps!
    ];

    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: overlappingRules,
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toMatch(/sobrepor/i);
  });
});

describe("Availability Rules — unauthorized", () => {
  it("GET sem token → 401", async () => {
    setupMocks();

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {},
    });

    expect(res.statusCode).toBe(401);
  });

  it("GET com token de outro usuário → 403", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "other-user" } } as any,
      error: null,
    });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "professionals") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { id: "other-prof-id" }, error: null }),
            }),
          }),
        };
      }
      return {} as any;
    });

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: { authorization: "Bearer token-of-other-user" },
    });

    // auth.professionalId ("other-prof-id") !== params.id ("prof-123") → 403
    expect(res.statusCode).toBe(403);
  });
});