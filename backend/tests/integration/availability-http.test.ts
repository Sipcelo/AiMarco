import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";
import { listAvailabilityRules } from "../../src/routes/v1/availability/list-rules.js";
import { createAvailabilityRules } from "../../src/routes/v1/availability/update-rules.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROF_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OTHER_ID = "44444444-4444-4444-4444-444444444444";

const MOCK_RULES = [
  { id: "r1", day_of_week: 1, start_time: "09:00", end_time: "18:00", professional_id: PROF_ID },
  { id: "r2", day_of_week: 2, start_time: "09:00", end_time: "18:00", professional_id: PROF_ID },
];

const MON_TO_FRI = [1, 2, 3, 4, 5].map((d) => ({
  day_of_week: d,
  start_time: "09:00",
  end_time: "18:00",
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockOwner(rules: any[] = MOCK_RULES) {
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: USER_ID } } as any,
    error: null,
  });
  vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: PROF_ID }, error: null }),
          }),
        }),
      } as any;
    }
    if (table === "availability_rules") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: rules, error: null }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
        insert: (rows: any[]) => ({
          select: () =>
            Promise.resolve({
              data: rows.map((r, i) => ({ id: `new-r-${i}`, ...r })),
              error: null,
            }),
        }),
      } as any;
    }
    return {} as any;
  });
}

function mockNonOwner() {
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: "other-user" } } as any,
    error: null,
  });
  vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: OTHER_ID }, error: null }),
          }),
        }),
      } as any;
    }
    return {} as any;
  });
}

async function buildApp() {
  const fastify = Fastify({ logger: false });
  await fastify.register(authPlugin);
  fastify.get("/v1/professionals/:id/availability", adaptHandler(listAvailabilityRules));
  fastify.post("/v1/professionals/:id/availability", adaptHandler(createAvailabilityRules));
  await fastify.ready();
  return fastify;
}

afterEach(() => vi.restoreAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /v1/professionals/:id/availability (list rules)", () => {
  it("owner gets 200 with rules array", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].day_of_week).toBe(1);
  });

  it("missing token returns 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/availability`,
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(401);
  });

  it("non-owner returns 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});

describe("POST /v1/professionals/:id/availability (batch create)", () => {
  it("batch Mon-Fri returns 201 with array of created rules", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: MON_TO_FRI,
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(5);
    expect(body[0].day_of_week).toBe(1);
  });

  it("batch with is_active included still returns 201 (field stripped silently)", async () => {
    mockOwner();
    const app = await buildApp();
    const payload = MON_TO_FRI.map((r) => ({ ...r, is_active: true }));
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload,
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(201);
  });

  it("overlapping rules on same day returns 409", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: [
        { day_of_week: 1, start_time: "09:00", end_time: "13:00" },
        { day_of_week: 1, start_time: "12:00", end_time: "18:00" }, // overlap!
      ],
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/sobrepor|overlap/i);
  });

  it("invalid time format returns 400", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: [{ day_of_week: 1, start_time: "9:00", end_time: "18:00" }], // missing leading zero
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(400);
  });

  it("missing token returns 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: { "content-type": "application/json" },
      payload: MON_TO_FRI,
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(401);
  });

  it("non-owner returns 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/availability`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: MON_TO_FRI,
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});
