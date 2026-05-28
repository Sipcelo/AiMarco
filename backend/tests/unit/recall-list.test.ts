/**
 * recall-list.test.ts
 *
 * Unit tests for recall-list business logic: identifying clients whose
 * last completed appointment is older than a threshold (default 30 days).
 */
import { describe, it, expect } from "vitest";

const FIXED_NOW = new Date("2026-03-26T12:00:00Z"); // data fixa para testes

function filterRecallClients(
  appointments: Array<{ client_id: string; scheduled_at: string }>,
  daysThreshold: number = 30,
  now: Date = new Date()
): Array<{ client_id: string; last_appointment_at: string }> {
  const thresholdDate = new Date(now);
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  thresholdDate.setHours(0, 0, 0, 0); // compare dates only (midnight)

  const lastPerClient = new Map<string, string>();
  appointments.forEach((a) => {
    const existing = lastPerClient.get(a.client_id);
    if (!existing || new Date(a.scheduled_at) > new Date(existing)) {
      lastPerClient.set(a.client_id, a.scheduled_at);
    }
  });

  const eligible = [];
  for (const [clientId, lastDate] of lastPerClient.entries()) {
    const apptDate = new Date(lastDate);
    apptDate.setHours(0, 0, 0, 0);
    if (apptDate < thresholdDate) {
      eligible.push({ client_id: clientId, last_appointment_at: lastDate });
    }
  }

  eligible.sort((a, b) => new Date(a.last_appointment_at).getTime() - new Date(b.last_appointment_at).getTime());
  return eligible;
}

function iso(dateStr: string): string {
  return new Date(dateStr).toISOString();
}

describe("recallList — pure logic", () => {
  it("RL-1: empty appointments → empty result", () => {
    expect(filterRecallClients([], 30, FIXED_NOW)).toEqual([]);
  });

  it("RL-2: client with recent appointment (<30d) is excluded", () => {
    // 10 days ago: 2026-03-16
    const recent = iso("2026-03-16T10:00:00Z");
    const appointments = [{ client_id: "c1", scheduled_at: recent }];
    expect(filterRecallClients(appointments, 30, FIXED_NOW)).toEqual([]);
  });

  it("RL-3: client with exactly 30 days old appointment is EXcluded", () => {
    // 30 days ago: 2026-02-24 (same day as threshold = excluded)
    const exactly30 = iso("2026-02-24T12:00:00Z");
    const appointments = [{ client_id: "c1", scheduled_at: exactly30 }];
    expect(filterRecallClients(appointments, 30, FIXED_NOW)).toEqual([]);
  });

  it("RL-4: client with 31 days old appointment is included", () => {
    // 31 days ago: 2026-02-23
    const old = iso("2026-02-23T12:00:00Z");
    const appointments = [{ client_id: "c1", scheduled_at: old }];
    const result = filterRecallClients(appointments, 30, FIXED_NOW);
    expect(result.length).toBe(1);
    expect(result[0].client_id).toBe("c1");
    expect(result[0].last_appointment_at).toBe(old);
  });

  it("RL-5: multiple appointments for same client — only latest considered", () => {
    const old = iso("2026-01-25T10:00:00Z"); // 60 days ago
    const recentish = iso("2026-03-06T10:00:00Z"); // 20 days ago (<30)
    const appointments = [
      { client_id: "c1", scheduled_at: old },
      { client_id: "c1", scheduled_at: recentish },
    ];
    expect(filterRecallClients(appointments, 30, FIXED_NOW)).toEqual([]);
  });

  it("RL-6: multiple clients mixed eligibility", () => {
    const old1 = iso("2026-02-20T10:00:00Z"); // 34 days ago
    const old2 = iso("2026-01-01T10:00:00Z"); // 84 days ago
    const recent = iso("2026-03-21T10:00:00Z"); // 5 days ago
    const appointments = [
      { client_id: "c1", scheduled_at: old1 },
      { client_id: "c2", scheduled_at: old2 },
      { client_id: "c3", scheduled_at: recent },
    ];
    const result = filterRecallClients(appointments, 30, FIXED_NOW);
    expect(result.length).toBe(2);
    expect(result[0].client_id).toBe("c2"); // oldest first
    expect(result[1].client_id).toBe("c1");
  });

  it("RL-7: threshold parameter customization", () => {
    const exactly45 = iso("2026-02-09T12:00:00Z"); // 45 days ago
    const appointments = [{ client_id: "c1", scheduled_at: exactly45 }];
    const result60 = filterRecallClients(appointments, 60, FIXED_NOW);
    expect(result60).toEqual([]); // 45 < 60
    const result30 = filterRecallClients(appointments, 30, FIXED_NOW);
    expect(result30.length).toBe(1);
  });

  it("RL-8: unordered input — latest appointment correctly identified", () => {
    const old = iso("2026-01-10T10:00:00Z");
    const middle = iso("2026-02-10T10:00:00Z");
    const newest = iso("2026-02-24T10:00:00Z"); // 30 dias? 2026-02-24 é exatamente 30; but we need >30 so this should be excluded? Vamos puxar para 2026-02-23.
    const newestEligible = iso("2026-02-23T10:00:00Z"); // 31 dias
    const appointments = [
      { client_id: "c1", scheduled_at: middle },
      { client_id: "c1", scheduled_at: newestEligible },
      { client_id: "c1", scheduled_at: old },
    ];
    const result = filterRecallClients(appointments, 30, FIXED_NOW);
    expect(result.length).toBe(1);
    expect(result[0].last_appointment_at).toBe(newestEligible);
  });

  it("RL-9: threshold inclusive boundary check (same day excluded)", () => {
    // Fixed now: 2026-03-26; threshold date = 2026-02-24 (midnight)
    const sameDay = iso("2026-02-24T00:00:00Z"); // exactly threshold date at midnight
    const appointments = [{ client_id: "c1", scheduled_at: sameDay }];
    const result = filterRecallClients(appointments, 30, FIXED_NOW);
    expect(result).toEqual([]); // excluded because not < threshold (equal)
  });

  it("RL-10: previous day (threshold -1) is included", () => {
    const dayBefore = iso("2026-02-23T23:59:59Z"); // one second before threshold day
    const appointments = [{ client_id: "c1", scheduled_at: dayBefore }];
    const result = filterRecallClients(appointments, 30, FIXED_NOW);
    expect(result.length).toBe(1);
  });
});
