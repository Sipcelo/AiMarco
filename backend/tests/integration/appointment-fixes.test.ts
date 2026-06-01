import { describe, it, expect, vi, afterEach } from "vitest";
import { supabase } from "../../src/lib/supabase.js";

// cancel-appointment lib is mocked so the empty-body parser test does not hit
// the real Supabase update; we only want to prove the request reaches the
// handler (i.e. it is NOT rejected with 400 for an empty JSON body).
vi.mock("../../src/lib/cancel-appointment.js", () => ({
  cancelAppointment: vi.fn(),
}));

import { getAvailableDays } from "../../src/lib/get-available-days.js";
import { updateAppointmentStatus } from "../../src/lib/update-appointment-status.js";
import { cancelAppointment } from "../../src/lib/cancel-appointment.js";
import { buildApp } from "../../src/app.js";

const PROF_ID = "88888888-8888-8888-8888-888888888888";
const USER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const APPT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

afterEach(() => vi.restoreAllMocks());

// ─── Fix #2: get-available-days must NOT filter on a non-existent is_active ─────
describe("getAvailableDays (lib)", () => {
  it("queries availability_rules without the non-existent is_active column", async () => {
    const eqCalls: Array<[string, unknown]> = [];

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table !== "availability_rules") return {} as any;
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          eqCalls.push([col, val]);
          // availability_rules has no is_active column: querying it would error.
          if (col === "is_active") {
            return Object.assign(
              Promise.resolve({ data: null, error: { message: "column availability_rules.is_active does not exist" } }),
              builder,
            );
          }
          return Object.assign(
            Promise.resolve({ data: [{ day_of_week: 1 }, { day_of_week: 3 }], error: null }),
            builder,
          );
        },
      };
      return builder;
    });

    const days = await getAvailableDays(PROF_ID, 14);

    expect(eqCalls.some(([col]) => col === "is_active")).toBe(false);
    expect(eqCalls).toContainEqual(["professional_id", PROF_ID]);
    expect(days).toHaveLength(14);
    expect(days[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns empty list when professional has no availability rules", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table !== "availability_rules") return {} as any;
      const builder: any = {
        select: () => builder,
        eq: () => Object.assign(Promise.resolve({ data: [], error: null }), builder),
      };
      return builder;
    });

    const days = await getAvailableDays(PROF_ID, 14);
    expect(days).toEqual([]);
  });
});

// ─── Fix #1: completing an appointment must NOT write a non-existent column ─────
describe("updateAppointmentStatus (lib)", () => {
  function mockAppointments(captured: { update?: Record<string, unknown> }) {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table !== "appointments") return {} as any;
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { id: APPT_ID, status: "confirmed" }, error: null }),
          }),
        }),
        update: (fields: Record<string, unknown>) => {
          captured.update = fields;
          return {
            eq: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: APPT_ID, status: "completed" }, error: null }),
              }),
            }),
          };
        },
      } as any;
    });
  }

  it("does not include completed_at when marking as completed", async () => {
    const captured: { update?: Record<string, unknown> } = {};
    mockAppointments(captured);

    await updateAppointmentStatus(APPT_ID, "completed");

    expect(captured.update).toBeDefined();
    expect(captured.update).not.toHaveProperty("completed_at");
    expect(captured.update!.status).toBe("completed");
  });

  it("marks no_show without extra columns", async () => {
    const captured: { update?: Record<string, unknown> } = {};
    mockAppointments(captured);

    await updateAppointmentStatus(APPT_ID, "no_show");

    expect(captured.update!.status).toBe("no_show");
    expect(captured.update).not.toHaveProperty("completed_at");
  });
});

// ─── Fix #4: empty JSON body on POST /cancel must not 400 ───────────────────────
describe("POST /v1/appointments/:id/cancel with empty JSON body", () => {
  it("reaches the handler (200) instead of FST_ERR_CTP_EMPTY_JSON_BODY (400)", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: USER_ID } } as any,
      error: null,
    });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "professionals") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: PROF_ID }, error: null }) }) }),
        } as any;
      }
      if (table === "appointments") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { professional_id: PROF_ID }, error: null }) }) }),
        } as any;
      }
      return {} as any;
    });
    vi.mocked(cancelAppointment).mockResolvedValue({
      id: APPT_ID,
      professional_id: PROF_ID,
      service_id: "svc-1",
      client_id: "cli-1",
      scheduled_at: "2026-06-01T10:00:00-03:00",
      status: "cancelled",
    } as any);

    const app = await buildApp({ logger: false, serveStatic: false });
    try {
      const res = await app.inject({
        method: "POST",
        url: `/v1/appointments/${APPT_ID}/cancel`,
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        // No payload: the client (mobile) sends Content-Type json with empty body.
      });

      expect(res.statusCode).not.toBe(400);
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("cancelled");
    } finally {
      await app.close();
    }
  });
});
