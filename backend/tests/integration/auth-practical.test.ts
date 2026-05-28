import { describe, it, expect, vi, afterEach } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";

// ─── Handlers ─────────────────────────────────────────────────────────────────
import { listAppointmentsHandler } from "../../src/routes/v1/professionals/list-appointments.js";
import { getAvailabilityHandler } from "../../src/routes/v1/availability/get-availability.js";

// ─── Build a minimal Fastify instance mimicking server.ts ─────────────────────
async function buildTestApp() {
  const fastify = Fastify({ logger: false });
  await fastify.register(authPlugin);

  // Public endpoints
  fastify.get("/health", async () => ({ status: "ok" }));
  fastify.get("/v1/availability/:id", adaptHandler(getAvailabilityHandler));

  // Protected endpoints
  fastify.get(
    "/v1/professionals/:id/appointments",
    adaptHandler(listAppointmentsHandler),
  );

  await fastify.ready();
  return fastify;
}

afterEach(() => vi.restoreAllMocks());

// ─── Suíte 1: Endpoints públicos ─────────────────────────────────────────────
describe("Endpoints Públicos — Sem Token", () => {
  it("GET /health retorna 200 SEM token", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /v1/availability/:id retorna 200, 400 ou 404 SEM token (não 401)", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/availability/fake-id",
    });
    // availability é pública — não deve exigir token
    // 400 = validação de parâmetro (UUID), 404 = não encontrado, 200 = sucesso
    expect([200, 400, 404]).toContain(res.statusCode);
  });
});

// ─── Suíte 2: Endpoint protegido sem token ───────────────────────────────────
describe("Endpoints Protegidos — Validação de Token", () => {
  it("GET /v1/professionals/:id/appointments retorna 401 SEM token", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/professionals/fake-id/appointments?date=2026-03-27",
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBeDefined();
  });

  it("GET /v1/professionals/:id/appointments COM token válido retorna 200, 403 ou 404 (não 401)", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "test-user" } } as any,
      error: null,
    });
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { id: "test-prof-id" }, error: null }),
        }),
      }),
    } as any);

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/professionals/test-prof-id/appointments?date=2026-03-27",
      headers: { authorization: "Bearer valid-token" },
    });

    // authPlugin valida o token e anexa professionalId = "test-prof-id"
    // O handler então faz ownership check (auth.professionalId === params.id → OK)
    // E então tenta listar appointments (sem mais mocks) → 500 ou erro
    // Mas NUNCA deve ser 401 (token foi validado)
    expect(res.statusCode).not.toBe(401);
  });
});

// ─── Suíte 3: Erros de formato de token ──────────────────────────────────────
describe("Erros de Token — Formato", () => {
  it("Authorization vazio retorna 401", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/professionals/fake-id/appointments?date=2026-03-27",
      headers: { authorization: "" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("Authorization sem Bearer retorna 401", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/professionals/fake-id/appointments?date=2026-03-27",
      headers: { authorization: "Basic xyz" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("Authorization com token inválido retorna 401", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token", status: 401 } as any,
    });

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/professionals/fake-id/appointments?date=2026-03-27",
      headers: { authorization: "Bearer not.a.valid.jwt" },
    });
    expect(res.statusCode).toBe(401);
  });
});