import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";
import { cancelAppointmentHandler } from "../../src/routes/v1/appointments/cancel-appointment.js";
import { updateStatusHandler } from "../../src/routes/v1/appointments/update-status.js";
import { listAppointmentsHandler } from "../../src/routes/v1/professionals/list-appointments.js";

// ─── Mock lib functions to avoid deep Supabase chain mocking ─────────────────
vi.mock("../../src/lib/cancel-appointment.js", () => ({
  cancelAppointment: vi.fn(),
}));
vi.mock("../../src/lib/update-appointment-status.js", () => ({
  updateAppointmentStatus: vi.fn(),
}));
vi.mock("../../src/lib/list-appointments.js", () => ({
  listAppointments: vi.fn(),
}));

import { cancelAppointment } from "../../src/lib/cancel-appointment.js";
import { updateAppointmentStatus } from "../../src/lib/update-appointment-status.js";
import { listAppointments } from "../../src/lib/list-appointments.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROF_ID = "88888888-8888-8888-8888-888888888888";
const USER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const OTHER_ID = "99999999-9999-9999-9999-999999999999";
const APPT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const MOCK_APPOINTMENT = {
  id: APPT_ID,
  professional_id: PROF_ID,
  service_id: "svc-1",
  client_id: "cli-1",
  scheduled_at: "2026-06-01T10:00:00-03:00",
  status: "confirmed" as const,
  service_name: "Corte",
  service_duration_minutes: 60,
  client_name: "João Silva",
  client_phone: "+5511999999999",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockOwnerAuth() {
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
    if (table === "appointments") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { professional_id: PROF_ID },
                error: null,
              }),
          }),
        }),
      } as any;
    }
    return {} as any;
  });
}

function mockNonOwnerAuth() {
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
    if (table === "appointments") {
      // appointment belongs to PROF_ID, but auth is OTHER_ID
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { professional_id: PROF_ID },
                error: null,
              }),
          }),
        }),
      } as any;
    }
    return {} as any;
  });
}

function mockAppointmentNotFound() {
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
    if (table === "appointments") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: { message: "not found", code: "PGRST116" },
              }),
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
  fastify.post("/v1/appointments/:id/cancel", adaptHandler(cancelAppointmentHandler));
  fastify.post("/v1/appointments/:id/status", adaptHandler(updateStatusHandler));
  fastify.get("/v1/professionals/:id/appointments", adaptHandler(listAppointmentsHandler));
  await fastify.ready();
  return fastify;
}

afterEach(() => vi.restoreAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /v1/appointments/:id/cancel", () => {
  it("owner cancels appointment and gets 200", async () => {
    mockOwnerAuth();
    vi.mocked(cancelAppointment).mockResolvedValue(
      { ...MOCK_APPOINTMENT, status: "cancelled" } as any
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/cancel`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(APPT_ID);
    expect(body.status).toBe("cancelled");
  });

  it("non-owner gets 403", async () => {
    mockNonOwnerAuth();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/cancel`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });

  it("appointment not found returns 404", async () => {
    mockAppointmentNotFound();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/cancel`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(404);
  });

  it("missing token returns 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/cancel`,
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(401);
  });
});

describe("POST /v1/appointments/:id/status", () => {
  it("status=completed returns 200", async () => {
    mockOwnerAuth();
    vi.mocked(updateAppointmentStatus).mockResolvedValue(
      { ...MOCK_APPOINTMENT, status: "completed" } as any
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/status`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { status: "completed" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("completed");
  });

  it("status=no_show returns 200", async () => {
    mockOwnerAuth();
    vi.mocked(updateAppointmentStatus).mockResolvedValue(
      { ...MOCK_APPOINTMENT, status: "no_show" } as any
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/status`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { status: "no_show" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("no_show");
  });

  it("invalid status value returns 400", async () => {
    mockOwnerAuth();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/status`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { status: "hacked" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/completed|no_show/i);
  });

  it("non-owner returns 403", async () => {
    mockNonOwnerAuth();
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/appointments/${APPT_ID}/status`,
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: { status: "completed" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});

describe("GET /v1/professionals/:id/appointments", () => {
  it("owner with valid date returns 200 with appointments array", async () => {
    mockOwnerAuth();
    vi.mocked(listAppointments).mockResolvedValue([MOCK_APPOINTMENT] as any);
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/appointments?date=2026-06-01`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe(APPT_ID);
  });

  it("missing date query param returns 400", async () => {
    mockOwnerAuth();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/appointments`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(400);
  });

  it("non-owner returns 403", async () => {
    mockNonOwnerAuth();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${PROF_ID}/appointments?date=2026-06-01`,
      headers: { authorization: "Bearer valid-token" },
    });
    afterAll(() => app.close());

    expect(res.statusCode).toBe(403);
  });
});
