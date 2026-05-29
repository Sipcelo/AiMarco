import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";
import { getProfile } from "../../src/routes/v1/profile/get-profile.js";
import { updateProfile } from "../../src/routes/v1/profile/update-profile.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROF_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";

const MOCK_PROF = {
  id: PROF_ID,
  auth_user_id: USER_ID,
  display_name: "Test Pro",
  full_name: "Test Professional",
  slug: "test-pro",
  bio: null,
  avatar_url: null,
  timezone: "America/Sao_Paulo",
  business_type: "hair",
  phone: "+5511999999999",
  email: "test@example.com",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockOwner(overrides: Record<string, unknown> = {}) {
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: USER_ID } } as any,
    error: null,
  });
  const profData = { ...MOCK_PROF, ...overrides };
  vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profData, error: null }),
          }),
        }),
        update: (patch: any) => ({
          eq: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { ...profData, ...patch }, error: null }),
            }),
          }),
        }),
      } as any;
    }
    return {} as any;
  });
}

function mockNonOwner() {
  // Auth resolves to a different professional
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: "other-user-id" } } as any,
    error: null,
  });
  vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { id: OTHER_ID }, error: null }),
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
  fastify.get("/v1/professionals/:id/profile", adaptHandler(getProfile));
  fastify.patch("/v1/professionals/:id/profile", adaptHandler(updateProfile));
  await fastify.ready();
  return fastify;
}

afterEach(() => vi.restoreAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /v1/professionals/:id/profile", () => {
  it("owner receives 200 with profile fields (no auth_user_id)", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(PROF_ID);
    expect(body.display_name).toBe("Test Pro");
    expect(body.slug).toBe("test-pro");
    // DTO must strip auth_user_id
    expect(body.auth_user_id).toBeUndefined();
  });

  it("non-owner receives 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBeTruthy();
  });

  it("missing token receives 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/profile`,
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(401);
  });
});

describe("PATCH /v1/professionals/:id/profile", () => {
  it("update display_name returns 200 with new name", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { display_name: "Novo Nome" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.display_name).toBe("Novo Nome");
    expect(body.id).toBe(PROF_ID);
  });

  it("update slug to valid value returns 200 with slug in response", async () => {
    mockOwner({ slug: "regina-s-hair" });
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { slug: "regina-s-hair" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.slug).toBe("regina-s-hair");
  });

  it("slug with spaces or uppercase returns 400", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { slug: "Regina S Hair" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeTruthy();
  });

  it("slug with trailing hyphen returns 400", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { slug: "invalid-" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(400);
  });

  it("non-owner receives 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { display_name: "Hacker" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });

  it("missing token receives 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/profile`,
      headers: { "content-type": "application/json" },
      payload: { display_name: "Test" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(401);
  });
});
