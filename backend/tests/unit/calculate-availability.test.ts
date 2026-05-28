/**
 * calculate-availability.test.ts
 *
 * Unit tests for calculateAvailability — the pure function that computes
 * the list of available start times for a given day.
 *
 * Coverage areas:
 *  - Empty day (no appointments, no blocks)
 *  - Appointments blocking slots
 *  - Blocked slots blocking slots
 *  - Multiple working intervals (lunch break scenario)
 *  - Edge cases: zero slots, single slot, minute boundaries
 *  - Output invariants: sorted, deduplicated
 */
import { describe, it, expect } from "vitest";
import { calculateAvailability } from "../../src/lib/calculate-availability";

// ─── Happy Paths ──────────────────────────────────────────────────────────────

describe("calculateAvailability — happy paths", () => {
  it("CA-1: empty day returns all possible slots", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    // 08:00 and 09:00 fit inside [08:00, 10:00] with duration=60
    expect(result).toEqual(["08:00", "08:15", "08:30", "08:45", "09:00"]);
  });

  it("CA-2: single appointment blocks overlapping slots", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [{ start: "09:00", duration: 60 }],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    // Slots from 08:15 to 08:59 would overlap with 09:00–10:00
    expect(result).not.toContain("08:15");
    expect(result).not.toContain("08:30");
    expect(result).not.toContain("08:45");
    expect(result).not.toContain("09:00");
    // 08:00 ends at 09:00 — no overlap (end == start is NOT overlap)
    expect(result).toContain("08:00");
    // 10:00 starts after appointment ends
    expect(result).toContain("10:00");
  });

  it("CA-3: blocked slot behaves exactly like an appointment", () => {
    const withAppointment = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [{ start: "09:00", duration: 60 }],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    const withBlocked = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [],
      blockedSlots: [{ start: "09:00", duration: 60 }],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    expect(withBlocked).toEqual(withAppointment);
  });

  it("CA-4: two working intervals (lunch break) do not leak slots across gap", () => {
    const result = calculateAvailability({
      workingIntervals: [
        { start: "08:00", end: "12:00" },
        { start: "13:00", end: "17:00" },
      ],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 60,
    });
    // Must not contain 12:00 (would end at 13:00 crossing into gap)
    expect(result).not.toContain("12:00");
    // Must contain last valid slot in morning and first in afternoon
    expect(result).toContain("11:00");
    expect(result).toContain("13:00");
  });

  it("CA-5: service duration exactly fills interval → exactly one slot", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    expect(result).toEqual(["08:00"]);
  });

  it("CA-6: service duration longer than interval → no slots", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "08:30" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    expect(result).toEqual([]);
  });

  it("CA-7: fully packed day → no slots", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [
        { start: "08:00", duration: 120 },
        { start: "10:00", duration: 120 },
      ],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    expect(result).toEqual([]);
  });
});

// ─── Output Invariants ────────────────────────────────────────────────────────

describe("calculateAvailability — output invariants", () => {
  it("INV-1: result is always sorted ascending", () => {
    const result = calculateAvailability({
      workingIntervals: [
        { start: "08:00", end: "10:00" },
        { start: "14:00", end: "16:00" },
      ],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });

  it("INV-2: result has no duplicates", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(result.length).toBe(new Set(result).size);
  });

  it("INV-3: all slots fit within working hours (start + duration <= interval end)", () => {
    const serviceDuration = 45;
    const intervalEnd = 12 * 60; // 12:00
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration,
      slotGranularity: 15,
    });
    result.forEach((slot) => {
      const [h, m] = slot.split(":").map(Number);
      expect(h * 60 + m + serviceDuration).toBeLessThanOrEqual(intervalEnd);
    });
  });

  it("INV-4: empty intervals list → no slots", () => {
    const result = calculateAvailability({
      workingIntervals: [],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(result).toEqual([]);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe("calculateAvailability — edge cases", () => {
  it("EDGE-1: appointment that exactly starts when slot ends — not blocked", () => {
    // Slot 08:00–09:00, appointment at 09:00 — no overlap
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [{ start: "09:00", duration: 60 }],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    expect(result).toContain("08:00");
  });

  it("EDGE-2: appointment ending exactly when slot starts — not blocked", () => {
    // Slot 09:00–10:00, appointment 08:00–09:00 — no overlap
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [{ start: "08:00", duration: 60 }],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    expect(result).toContain("09:00");
  });

  it("EDGE-3: 1-minute granularity fills more slots than 15-minute", () => {
    const coarse = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    const fine = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 1,
    });
    expect(fine.length).toBeGreaterThan(coarse.length);
  });

  it("EDGE-4: multiple blocks create multiple gaps, all gaps return slots", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [
        { start: "09:00", duration: 30 },
        { start: "10:30", duration: 30 },
      ],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 30,
    });
    expect(result).toContain("08:00");
    expect(result).toContain("08:30");
    expect(result).toContain("09:30");
    expect(result).toContain("10:00");
    expect(result).toContain("11:00");
    expect(result).toContain("11:30");
  });

  it("EDGE-5: adjacent blocked slots with no gap still block correctly", () => {
    const result = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [],
      blockedSlots: [
        { start: "09:00", duration: 30 },
        { start: "09:30", duration: 30 },
      ],
      serviceDuration: 30,
      slotGranularity: 30,
    });
    // 08:30 → ends at 09:00 exactly → no overlap
    expect(result).toContain("08:30");
    // 10:00 starts after 10:00 (9:30+30) → fine
    expect(result).toContain("10:00");
    // 09:00 or 09:30 must NOT appear
    expect(result).not.toContain("09:00");
    expect(result).not.toContain("09:30");
  });
});
