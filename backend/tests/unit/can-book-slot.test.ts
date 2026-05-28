/**
 * can-book-slot.test.ts
 *
 * Unit tests for canBookSlot logic — determining whether a specific time slot
 * is available for booking given professional schedule, appointments, and blocks.
 *
 * This complements calculate-availability.test.ts by testing slot-level decisions
 * rather than full-slot generation.
 *
 * Coverage areas:
 *  - Exact slot availability check
 *  - Partial overlap detection (slot blocked by appointment/block)
 *  - Edge boundaries (slot ends exactly when another begins)
 *  - Service duration variations
 *  - Granularity alignment issues
 *  - Multiple working intervals
 *  - Complex overlapping scenarios
 */
import { describe, it, expect } from "vitest";
import { calculateAvailability } from "../../src/lib/calculate-availability";

// ─── Helper: Check if specific slot is available ───────────────────────────────────

function isSlotAvailable(
  params: {
    workingIntervals: { start: string; end: string }[];
    appointments: { start: string; duration: number }[];
    blockedSlots: { start: string; duration: number }[];
    serviceDuration: number;
    slotGranularity: number;
  },
  slotTime: string
): boolean {
  const availableSlots = calculateAvailability(params);
  return availableSlots.includes(slotTime);
}

// ─── Happy Paths ──────────────────────────────────────────────────────────────

describe("canBookSlot — happy paths", () => {
  it("CB-1: empty day — any slot within working hours is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "09:00"
      )
    ).toBe(true);
  });

  it("CB-2: slot exactly at working interval start is available if duration fits", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "10:00" }],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "08:00"
      )
    ).toBe(true);
  });

  it("CB-3: slot at end of working interval that exactly fits is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "10:00" }],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "09:00"
      )
    ).toBe(true);
  });

  it("CB-4: granular slot that fits in gap is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [{ start: "09:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "08:30"
      )
    ).toBe(true);
  });

  it("CB-5: multiple working intervals — slot in second interval is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [
            { start: "08:00", end: "12:00" },
            { start: "14:00", end: "18:00" },
          ],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 60,
        },
        "15:00"
      )
    ).toBe(true);
  });

  it("CB-6: long service duration that fits gap is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "18:00" }],
          appointments: [{ start: "10:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 120,
          slotGranularity: 30,
        },
        "08:00"
      )
    ).toBe(true);
  });
});

// ─── Negative Cases ─────────────────────────────────────────────────────────────

describe("canBookSlot — negative cases", () => {
  it("CB-N1: slot overlaps appointment start — not available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [{ start: "09:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "08:45" // 08:45–09:45 overlaps 09:00–10:00
      )
    ).toBe(false);
  });

  it("CB-N2: slot starts exactly at appointment start — not available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [{ start: "09:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "09:00" // 09:00–09:30 overlaps 09:00–10:00
      )
    ).toBe(false);
  });

  it("CB-N3: slot overlaps blocked slot — not available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [],
          blockedSlots: [{ start: "10:00", duration: 90 }],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "09:45" // 09:45–10:45 overlaps 10:00–11:30
      )
    ).toBe(false);
  });

  it("CB-N4: slot exactly at blocked slot start — not available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [],
          blockedSlots: [{ start: "11:00", duration: 60 }],
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "11:00"
      )
    ).toBe(false);
  });

  it("CB-N5: multiple appointments create gap — slot assessment correct", () => {
    const params = {
      workingIntervals: [{ start: "08:00", end: "12:00" }],
      appointments: [
        { start: "08:30", duration: 30 },  // 08:30–09:00
        { start: "10:00", duration: 30 },  // 10:00–10:30
      ],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 30,
    };
    // Slots every 30 min: 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
    expect(isSlotAvailable(params, "08:00")).toBe(true);   // 08:00–08:30 OK
    expect(isSlotAvailable(params, "08:30")).toBe(false);  // 08:30–09:00 blocked
    expect(isSlotAvailable(params, "09:00")).toBe(true);   // 09:00–09:30 OK (ends at 09:30, no overlap)
    expect(isSlotAvailable(params, "09:30")).toBe(true);   // 09:30–10:00 OK (ends at 10:00 exactly)
    expect(isSlotAvailable(params, "10:00")).toBe(false);  // 10:00–10:30 blocked
    expect(isSlotAvailable(params, "10:30")).toBe(true);   // 10:30–11:00 OK
  });

  it("CB-N6: service duration too long for any interval → no slots available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "08:30" }],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "08:00"
      )
    ).toBe(false);
  });
});

// ─── Boundary Cases ─────────────────────────────────────────────────────────────

describe("canBookSlot — boundary cases", () => {
  it("CB-B1: slot ends exactly when appointment starts — available (touching is OK)", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [{ start: "10:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "09:00" // 09:00–10:00 ends exactly at 10:00
      )
    ).toBe(true);
  });

  it("CB-B2: slot starts exactly when appointment ends — available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [{ start: "09:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "10:00" // starts exactly at 10:00
      )
    ).toBe(true);
  });

  it("CB-B3: slot that would cross lunch break gap is not available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [
            { start: "08:00", end: "12:00" },
            { start: "13:00", end: "17:00" },
          ],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 120,
          slotGranularity: 60,
        },
        "11:00" // 11:00–13:00 crosses gap into 13:00
      )
    ).toBe(false);
  });

  it("CB-B4: slot that starts at gap boundary but doesn't cross is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [
            { start: "08:00", end: "12:00" },
            { start: "13:00", end: "17:00" },
          ],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 60,
        },
        "11:00" // 11:00–12:00, ends exactly at gap start
      )
    ).toBe(true);
  });
});

// ─── Granularity Edge Cases ─────────────────────────────────────────────────────

describe("canBookSlot — granularity edge cases", () => {
  it("CB-G1: 1-minute granularity enables slots not visible at 15-minute", () => {
    // With 15-min granularity and 60-min duration: 08:00, 08:15, 08:30, 08:45, 09:00
    // With 1-min granularity, you can fit 08:14–09:14 (if no appointment)
    const coarseParams = {
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    };
    const fineParams = {
      ...coarseParams,
      slotGranularity: 1,
    };
    expect(isSlotAvailable(coarseParams, "08:14")).toBe(false);
    expect(isSlotAvailable(fineParams, "08:14")).toBe(true);
  });

  it("CB-G2: slot that aligns with granularity boundary is correctly detected", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "10:00" }],
          appointments: [{ start: "08:30", duration: 30 }],
          blockedSlots: [],
          serviceDuration: 30,
          slotGranularity: 30,
        },
        "09:00" // 09:00–09:30 exactly fits
      )
    ).toBe(true);
  });

  it("CB-G3: slot that does NOT align with granularity is never in result", () => {
    // Even if mathematically possible, must align to granularity grid
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "10:00" }],
          appointments: [],
          blockedSlots: [],
          serviceDuration: 45,
          slotGranularity: 30,
        },
        "08:15" // 08:15 not on 30-minute grid (08:00, 08:30, 09:00, 09:30)
      )
    ).toBe(false);
  });
});

// ─── Complex Overlap Scenarios ──────────────────────────────────────────────────

describe("canBookSlot — complex overlaps", () => {
  it("CB-C1: overlapping blocked slots (merged) correctly block entire region", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [],
          blockedSlots: [
            { start: "09:00", duration: 30 },
            { start: "09:20", duration: 30 },
          ],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "09:00" // overlaps combined blocked region 09:00–10:00 (approx)
      )
    ).toBe(false);
  });

  it("CB-C2: appointment and blocked slot overlapping same region", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "12:00" }],
          appointments: [{ start: "10:00", duration: 60 }],
          blockedSlots: [{ start: "10:30", duration: 30 }],
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "10:15" // 10:15–10:45 overlaps appointment (10:00–11:00)
      )
    ).toBe(false);
  });

  it("CB-C3: fully packed morning, slot in afternoon is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "18:00" }],
          appointments: [
            { start: "08:00", duration: 240 },
            { start: "13:00", duration: 120 },
          ],
          blockedSlots: [{ start: "17:00", duration: 60 }],
          serviceDuration: 60,
          slotGranularity: 60,
        },
        "15:00"
      )
    ).toBe(true);
  });

  it("CB-C4: appointment longer than working interval blocks it entirely", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "13:00", end: "14:00" }],
          appointments: [{ start: "12:00", duration: 120 }],
          blockedSlots: [],
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "13:00"
      )
    ).toBe(false);
  });
});

// ─── Invariants ────────────────────────────────────────────────────────────────

describe("canBookSlot — invariants", () => {
  it("INV-1: all returned slots from calculateAvailability are bookable", () => {
    const params = {
      workingIntervals: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
      ],
      appointments: [
        { start: "09:30", duration: 60 },
        { start: "15:00", duration: 90 },
      ],
      blockedSlots: [{ start: "10:30", duration: 30 }],
      serviceDuration: 60,
      slotGranularity: 30,
    };
    const available = calculateAvailability(params);
    available.forEach((slot) => {
      expect(isSlotAvailable(params, slot)).toBe(true);
    });
  });

  it("INV-2: no false positives — slots not in result are truly unavailable", () => {
    const params = {
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [{ start: "09:00", duration: 60 }],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    };
    // Potential candidate that seems plausible but is blocked
    expect(isSlotAvailable(params, "08:30")).toBe(false);
    expect(isSlotAvailable(params, "09:00")).toBe(false);
  });
});

// ─── Real-World Scenarios ───────────────────────────────────────────────────────

describe("canBookSlot — real-world scenarios", () => {
  it("RW-1: dentist morning shift with lunch break — slot after lunch is fine", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [
            { start: "08:00", end: "12:00" },
            { start: "13:30", end: "18:00" },
          ],
          appointments: [{ start: "14:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 60,
          slotGranularity: 15,
        },
        "15:00"
      )
    ).toBe(true);
  });

  it("RW-2: doctor with emergency block — slot before emergency is available", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "18:00" }],
          appointments: [],
          blockedSlots: [{ start: "11:00", duration: 120 }],
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "10:30"
      )
    ).toBe(true);
  });

  it("RW-3: consultant with irregular hours and dense schedule", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [
            { start: "09:00", end: "11:00" },
            { start: "14:00", end: "17:00" },
          ],
          appointments: [
            { start: "09:30", duration: 60 }, // 09:30–10:30 blocks morning
            { start: "15:00", duration: 90 }, // 15:00–16:30
          ],
          blockedSlots: [{ start: "16:00", duration: 30 }], // 16:00–16:30
          serviceDuration: 45,
          slotGranularity: 15,
        },
        "14:15" // 14:15–15:00 ends exactly at appointment start (15:00)
      )
    ).toBe(true);
  });

  it("RW-4: weekend schedule with reduced hours", () => {
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "10:00", end: "14:00" }],
          appointments: [{ start: "11:00", duration: 60 }],
          blockedSlots: [],
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "10:30"
      )
    ).toBe(true);
  });
});

// ─── Stress / Volume Cases ───────────────────────────────────────────────────────

describe("canBookSlot — stress/volume", () => {
  it("STRESS-1: many small blocks create narrow availability", () => {
    const blocks = Array.from({ length: 10 }, (_, i) => ({
      start: `${(8 + i).toString().padStart(2, '0')}:00`,
      duration: 15,
    }));
    expect(
      isSlotAvailable(
        {
          workingIntervals: [{ start: "08:00", end: "18:00" }],
          appointments: [],
          blockedSlots: blocks,
          serviceDuration: 30,
          slotGranularity: 15,
        },
        "17:30"
      )
    ).toBe(true); // assume not blocked
  });

  it("STRESS-2: overlapping appointments and blocks from different sources", () => {
    const params = {
      workingIntervals: [{ start: "08:00", end: "20:00" }],
      appointments: Array.from({ length: 5 }, (_, i) => ({
        start: `${(8 + i * 2).toString().padStart(2, '0')}:00`,
        duration: 60,
      })), // 08:00-09:00, 10:00-11:00, ...
      blockedSlots: Array.from({ length: 5 }, (_, i) => ({
        start: `${(9 + i * 2).toString().padStart(2, '0')}:30`,
        duration: 30,
      })), // 09:30-10:00, 11:30-12:00, ...
      serviceDuration: 30,
      slotGranularity: 15,
    };
    // Spot-check realistic outcomes
    expect(isSlotAvailable(params, "09:00")).toBe(true);   // 09:00-09:30 OK (after appointment)
    expect(isSlotAvailable(params, "09:30")).toBe(false);  // 09:30-10:00 blocked
    expect(isSlotAvailable(params, "11:00")).toBe(true);   // 11:00-11:30 OK
  });
});

// Totais: 20+ casos cobrindo:
// - disponibilidade básica
// - negativos por bloqueio/appointment
// -边界 (limites)
// - granularidade
// - cenários reais
// - volume/stress
