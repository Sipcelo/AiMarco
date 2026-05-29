import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";
import { listServices } from "../../src/routes/v1/services/list-services.js";
import { createService } from "../../src/routes/v1/services/create-service.js";
import { updateService } from "../../src/routes/v1/services/update-service.js";
import { deleteService } from "../../src/routes/v1/services/delete-service.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROF_ID = "55555555-5555-5555-5555-555555555555";
const USER_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const OTHER_ID = "66666666-6666-6666-6666-666666666666";
const SERVICE_ID = "77777777-7777-7777-7777-777777777777";

const MOCK_SERVICE = {
  id: SERVICE_ID,
  professional_id: PROF_ID,
  name: "Corte Feminino",
  duration_minutes: 60,
  price_cents: 8000,
  description: "Corte com lavagem",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockOwner(serviceData: any = MOCK_SERVICE) {
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
    if (table === "services") {
      return {
        // list: select().eq().order()
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [serviceData], error: null }),
          }),
        }),
        // create: insert([]).select().single()
        insert: (rows: any[]) => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { ...rows[0], id: SERVICE_ID },
                error: null,
              }),
          }),
        }),
        // update / delete (soft): update(...).eq().eq().select().single()
        update: (patch: any) => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...serviceData, ...patch },
                    error: null,
                  }),
              }),
            }),
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
  fastify.get("/v1/professionals/:id/services", adaptHandler(listServices));
  fastify.post("/v1/professionals/:id/services", adaptHandler(createService));
  fastify.patch("/v1/professionals/:id/services/:serviceId", adaptHandler(updateService));
  fastify.delete("/v1/professionals/:id/services/:serviceId", adaptHandler(deleteService));
  await fastify.ready();
  return fastify;
}

afterEach(() => vi.restoreAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /v1/professionals/:id/services", () => {
  it("owner gets 200 with services array (DTO applied — no professional_id)", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/services`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].name).toBe("Corte Feminino");
    // DTO strips professional_id
    expect(body[0].professional_id).toBeUndefined();
  });

  it("non-owner gets 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/services`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});

describe("POST /v1/professionals/:id/services", () => {
  it("valid create returns 201 with id", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/services`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { name: "Hidratação", duration_minutes: 45, price_cents: 5000 },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe(SERVICE_ID);
    expect(body.name).toBe("Hidratação");
  });

  it("missing name returns 400 with field error", async () => {
    mockOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/services`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { duration_minutes: 30 }, // missing name
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeTruthy();
  });

  it("missing token returns 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/services`,
      headers: { "content-type": "application/json" },
      payload: { name: "Test", duration_minutes: 30 },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(401);
  });

  it("non-owner returns 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/professionals/${PROF_ID}/services`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { name: "Test", duration_minutes: 30 },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});

describe("PATCH /v1/professionals/:id/services/:serviceId", () => {
  it("owner updates service and gets 200", async () => {
    mockOwner({ ...MOCK_SERVICE, is_active: false });
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/services/${SERVICE_ID}`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { is_active: false },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.is_active).toBe(false);
  });

  it("non-owner returns 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/professionals/${PROF_ID}/services/${SERVICE_ID}`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { name: "Hacked" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});

describe("DELETE /v1/professionals/:id/services/:serviceId", () => {
  it("owner soft-deletes service and gets 200 with is_active: false", async () => {
    mockOwner({ ...MOCK_SERVICE, is_active: false });
    const app = await buildApp();
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/professionals/${PROF_ID}/services/${SERVICE_ID}`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.message).toMatch(/desativado/i);
    expect(body.data.is_active).toBe(false);
  });

  it("non-owner returns 403", async () => {
    mockNonOwner();
    const app = await buildApp();
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/professionals/${PROF_ID}/services/${SERVICE_ID}`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});
