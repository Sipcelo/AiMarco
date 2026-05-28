/**
 * reschedule-security.test.ts
 *
 * Security tests for POST /v1/appointments/:id/reschedule
 *
 * Covers:
 *   - Ownership: profissional B não pode reagendar appointment de A (403)
 *   - Body inválido: new_scheduled_at ausente (400)
 *   - Body inválido: new_scheduled_at com formato errado (400)
 *   - Conflito de horário retornado pelo RPC (409)
 *   - Appointment inexistente (404)
 *
 * Uses fastify.inject() — sem porta real.
 * Mock pattern: vi.spyOn(supabase.auth, 'getUser') + vi.spyOn(supabase, 'from') + vi.spyOn(supabase, 'rpc')
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";
import { rescheduleAppointment } from "../../src/routes/v1/appointments/reschedule-appointment.js";

const OWNER_USER_ID = "owner-user-id";
const OWNER_PROF_ID = "owner-prof-id";
const OTHER_PROF_ID = "other-prof-id";
const APPOINTMENT_ID = "appt-uuid-123";
const VALID_ISO = "2026-06-15T14:00:00-03:00";

async function buildApp() {
  const fastify = Fastify({ logger: false });
  await fastify.register(authPlugin);
  fastify.post(
    "/v1/appointments/:id/reschedule",
    adaptHandler(rescheduleAppointment),
  );
  await fastify.ready();
  return fastify;
}

/**
 * Mock authPlugin + appointment ownership.
 * appointmentOwnerProfId: professional_id stored in the appointments row.
 */
function mockAuth(appointmentOwnerProfId: string) {
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: OWNER_USER_ID } } as any,
    error: null,
  });

  vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { id: OWNER_PROF_ID }, error: null }),
          }),
        }),
      } as any;
    }
    // appointments table — returns the appointment row with its owner
    return {
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { professional_id: appointmentOwnerProfId },
              error: null,
            }),
        }),
      }),
    } as any;
  });
}

function mockAuthAppointmentNotFound() {
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: OWNER_USER_ID } } as any,
    error: null,
  });

  vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { id: OWNER_PROF_ID }, error: null }),
          }),
        }),
      } as any;
    }
    return {
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: null, error: { message: "not found" } }),
        }),
      }),
    } as any;
  });
}

// ─── Ownership ────────────────────────────────────────────────────────────────

describe("Reschedule — Ownership check", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 403 when authenticated professional tries to reschedule another professional's appointment", async () => {
    mockAuth(OTHER_PROF_ID); // appointment belongs to OTHER_PROF_ID, auth returns OWNER_PROF_ID
    const app = await buildApp();

    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      headers: { authorization: "Bearer valid-token" },
      payload: { new_scheduled_at: VALID_ISO },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error).toMatch(/permissão/i);
  });

  it("returns 200 when owner reschedules their own appointment", async () => {
    mockAuth(OWNER_PROF_ID); // appointment belongs to OWNER_PROF_ID, auth also returns OWNER_PROF_ID
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: {
        id: APPOINTMENT_ID,
        professional_id: OWNER_PROF_ID,
        service_id: "svc-1",
        client_id: "client-1",
        scheduled_at: VALID_ISO,
        status: "confirmed",
      },
      error: null,
    } as any);

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      headers: { authorization: "Bearer valid-token" },
      payload: { new_scheduled_at: VALID_ISO },
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 404 when appointment does not exist", async () => {
    mockAuthAppointmentNotFound();
    const app = await buildApp();

    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/non-existent-id/reschedule`,
      headers: { authorization: "Bearer valid-token" },
      payload: { new_scheduled_at: VALID_ISO },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toMatch(/não encontrado/i);
  });
});

// ─── Body validation ──────────────────────────────────────────────────────────

describe("Reschedule — Body validation", () => {
  beforeEach(() => mockAuth(OWNER_PROF_ID));
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when new_scheduled_at is missing", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      headers: { authorization: "Bearer valid-token" },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toMatch(/inválidos?/i);
  });

  it("returns 400 when new_scheduled_at is not a valid ISO date", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      headers: { authorization: "Bearer valid-token" },
      payload: { new_scheduled_at: "15/06/2026 14:00" },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toMatch(/inválidos?/i);
    expect(body.details).toBeDefined();
    expect(body.details[0].field).toBe("new_scheduled_at");
  });

  it("returns 400 when new_scheduled_at is an empty string", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      headers: { authorization: "Bearer valid-token" },
      payload: { new_scheduled_at: "" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: "not json {{",
    });

    expect(res.statusCode).toBe(400);
  });
});

// ─── Conflict (409) ───────────────────────────────────────────────────────────

describe("Reschedule — Conflict handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 409 when RPC signals scheduling conflict", async () => {
    mockAuth(OWNER_PROF_ID);
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: { error: "Horário indisponível: conflito com agendamento existente." },
      error: null,
    } as any);

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      headers: { authorization: "Bearer valid-token" },
      payload: { new_scheduled_at: VALID_ISO },
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toMatch(/indisponível|conflito/i);
  });
});

// ─── Unauthenticated ──────────────────────────────────────────────────────────

describe("Reschedule — Authentication required", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when no Authorization header is provided", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: { message: "No token", status: 401 } as any,
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPOINTMENT_ID}/reschedule`,
      payload: { new_scheduled_at: VALID_ISO },
    });

    expect(res.statusCode).toBe(401);
  });
});
