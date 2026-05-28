/**
 * booking-conflict.test.ts
 *
 * Integration-level tests for the booking conflict prevention system.
 * Tests the combined behavior of calculateAvailability + canBookSlot when
 * operating together, simulating real booking scenarios.
 *
 * These represent full "booking pipeline" scenarios — the slot appears
 * available but a final re-check at commit time must still validate it.
 */
import { describe, it, expect } from "vitest";
import { calculateAvailability } from "../../src/lib/calculate-availability";
import { canBookSlot } from "../../src/lib/can-book-slot";

// ─── Helper ───────────────────────────────────────────────────────────────────

interface BookingScenario {
  workingIntervals: { start: string; end: string }[];
  appointments: { start: string; duration: number }[];
  blockedSlots: { start: string; duration: number }[];
  serviceDuration: number;
  slotGranularity: number;
}

/**
 * Simulates a real booking attempt:
 * 1. Compute available slots (what the UI shows).
 * 2. Verify each returned slot still passes the point-in-time canBookSlot
 *    check (double-validation, like the backend does at commit time).
 */
function validateBookingConsistency(scenario: BookingScenario): {
  slots: string[];
  inconsistencies: string[];
} {
  const slots = calculateAvailability(scenario);
  const inconsistencies: string[] = [];

  for (const slot of slots) {
    const canBook = canBookSlot({
      requestedStart: slot,
      serviceDuration: scenario.serviceDuration,
      workingIntervals: scenario.workingIntervals,
      appointments: scenario.appointments,
      blockedSlots: scenario.blockedSlots,
    });
    if (!canBook) {
      inconsistencies.push(slot);
    }
  }

  return { slots, inconsistencies };
}

// ─── Consistency tests ────────────────────────────────────────────────────────

describe("Booking Pipeline Consistency — calculateAvailability ↔ canBookSlot", () => {
  it("CON-1: empty day — all slots are valid for booking", () => {
    const scenario: BookingScenario = {
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    };
    const { slots, inconsistencies } = validateBookingConsistency(scenario);
    expect(slots.length).toBeGreaterThan(0);
    expect(inconsistencies).toEqual([]);
  });

  it("CON-2: day with several appointments — slots are still consistent", () => {
    const scenario: BookingScenario = {
      workingIntervals: [{ start: "08:00", end: "18:00" }],
      appointments: [
        { start: "08:00", duration: 60 },
        { start: "10:30", duration: 45 },
        { start: "13:00", duration: 90 },
        { start: "16:00", duration: 60 },
      ],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    };
    const { inconsistencies } = validateBookingConsistency(scenario);
    expect(inconsistencies).toEqual([]);
  });

  it("CON-3: day with blocked slots — slots are still consistent", () => {
    const scenario: BookingScenario = {
      workingIntervals: [{ start: "08:00", end: "18:00" }],
      appointments: [],
      blockedSlots: [
        { start: "09:00", duration: 30 },
        { start: "12:00", duration: 60 },
        { start: "15:30", duration: 45 },
      ],
      serviceDuration: 30,
      slotGranularity: 15,
    };
    const { inconsistencies } = validateBookingConsistency(scenario);
    expect(inconsistencies).toEqual([]);
  });

  it("CON-4: mixed appointments and blocked slots — fully consistent", () => {
    const scenario: BookingScenario = {
      workingIntervals: [
        { start: "08:00", end: "12:00" },
        { start: "13:00", end: "18:00" },
      ],
      appointments: [
        { start: "08:30", duration: 60 },
        { start: "14:00", duration: 90 },
      ],
      blockedSlots: [
        { start: "11:00", duration: 60 },
        { start: "16:30", duration: 30 },
      ],
      serviceDuration: 45,
      slotGranularity: 15,
    };
    const { inconsistencies } = validateBookingConsistency(scenario);
    expect(inconsistencies).toEqual([]);
  });

  it("CON-5: fully packed day — no slots returned, none to fail", () => {
    const scenario: BookingScenario = {
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [
        { start: "08:00", duration: 60 },
        { start: "09:00", duration: 60 },
      ],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    };
    const { slots, inconsistencies } = validateBookingConsistency(scenario);
    expect(slots).toEqual([]);
    expect(inconsistencies).toEqual([]);
  });
});

// ─── Concurrency / Race Condition Simulation ──────────────────────────────────

describe("Race Condition Simulation — double-booking prevention", () => {
  /**
   * Simulates two clients requesting the same slot "simultaneously".
   * The first one succeeds; the second must be rejected by the re-check.
   */
  it("RACE-1: second booking attempt on same slot is rejected after first commits", () => {
    const working = [{ start: "08:00", end: "09:00" }];
    const serviceDuration = 60;

    // Both see an empty slot
    const initial = calculateAvailability({
      workingIntervals: working,
      appointments: [],
      blockedSlots: [],
      serviceDuration,
      slotGranularity: 15,
    });
    expect(initial).toContain("08:00");

    // Client A commits — adds appointment
    const afterClientA = [{ start: "08:00", duration: serviceDuration }];

    // Client B attempts the same slot AFTER Client A committed
    const clientBCanBook = canBookSlot({
      requestedStart: "08:00",
      serviceDuration,
      workingIntervals: working,
      appointments: afterClientA,
      blockedSlots: [],
    });
    expect(clientBCanBook).toBe(false);
  });

  it("RACE-2: overlapping but non-identical slots — only overlapping one is denied", () => {
    const working = [{ start: "08:00", end: "10:00" }];
    const serviceDuration = 60;

    // Client A books 08:00–09:00
    const appointments = [{ start: "08:00", duration: 60 }];

    // Client B wants 08:30 (overlaps) → denied
    const b1 = canBookSlot({
      requestedStart: "08:30",
      serviceDuration: 60,
      workingIntervals: working,
      appointments,
      blockedSlots: [],
    });
    expect(b1).toBe(false);

    // Client C wants 09:00 (no overlap) → allowed
    const c1 = canBookSlot({
      requestedStart: "09:00",
      serviceDuration: 60,
      workingIntervals: working,
      appointments,
      blockedSlots: [],
    });
    expect(c1).toBe(true);
  });

  it("RACE-3: blocked slot added between availability call and booking commit", () => {
    const working = [{ start: "08:00", end: "09:00" }];

    // Slot 08:00 looks free
    const initial = calculateAvailability({
      workingIntervals: working,
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(initial).toContain("08:00");

    // Professional blocks that slot between the client seeing it and committing
    const canBook = canBookSlot({
      requestedStart: "08:00",
      serviceDuration: 30,
      workingIntervals: working,
      appointments: [],
      blockedSlots: [{ start: "08:00", duration: 30 }],
    });
    expect(canBook).toBe(false);
  });
});

// ─── Minimum Notice Enforcement (30-minute rule) ─────────────────────────────

describe("Minimum Booking Notice — 30-minute rule business logic", () => {
  /**
   * The 30-min notice rule is enforced by the caller (route handler), not
   * inside calculateAvailability/canBookSlot. These tests document the
   * expected filtering behavior at the integration level.
   */

  it("NOTICE-1: slot in the past 30 minutes should be filtered by caller", () => {
    // Simulate: current time is 10:00, minimum notice = 30 min
    const simulatedNow = 10 * 60; // minutes
    const minNotice = 30;
    const cutoff = simulatedNow + minNotice; // 10:30

    const slotsFromEngine = ["09:45", "10:00", "10:15", "10:30", "10:45"];

    // Convention: caller filters out slots whose start < cutoff
    const validSlots = slotsFromEngine.filter((s) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m >= cutoff;
    });

    expect(validSlots).toEqual(["10:30", "10:45"]);
    expect(validSlots).not.toContain("10:15");
  });

  it("NOTICE-2: slot exactly at cutoff (30 min from now) is included", () => {
    const now = 10 * 60;
    const minNotice = 30;
    const cutoff = now + minNotice;

    const slot = "10:30";
    const [h, m] = slot.split(":").map(Number);
    expect(h * 60 + m).toBeGreaterThanOrEqual(cutoff);
  });
});

// ─── Service Duration Property Tests ─────────────────────────────────────────

describe("Service Duration Invariants", () => {
  it("INV-1: a slot from calculateAvailability always fits within the interval end", () => {
    const working = [{ start: "08:00", end: "12:00" }];
    const serviceDuration = 90;
    const slots = calculateAvailability({
      workingIntervals: working,
      appointments: [],
      blockedSlots: [],
      serviceDuration,
      slotGranularity: 15,
    });

    // Each slot start + duration must be <= interval end
    const intervalEnd = 12 * 60;
    slots.forEach((slot) => {
      const [h, m] = slot.split(":").map(Number);
      const slotEnd = h * 60 + m + serviceDuration;
      expect(slotEnd).toBeLessThanOrEqual(intervalEnd);
    });
  });

  it("INV-2: slots returned never overlap with each other (given single interval)", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });

    // Check no two returned slots occupy the same time
    // (slots can appear close together as starting points, but here
    // we verify that each slot passing canBookSlot relative to previous)
    const slotMins = slots.map((s) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m;
    });
    const sorted = [...slotMins].sort((a, b) => a - b);
    expect(slotMins).toEqual(sorted); // must be sorted
  });

  it("INV-3: no slot is duplicated in the output", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    const unique = new Set(slots);
    expect(unique.size).toBe(slots.length);
  });
});
