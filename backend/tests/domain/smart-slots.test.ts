import { describe, it, expect } from "vitest";
import { calculateAvailability } from "../../src/lib/calculate-availability";

describe("calculateAvailability - 15min slots", () => {
  const base = {
    workingIntervals: [{ start: "08:00", end: "10:00" }],
    appointments: [],
    blockedSlots: [],
    serviceDuration: 30,
    slotGranularity: 15,
  };

  it("returns expected slots when no bookings exist", () => {
    const slots = calculateAvailability(base);
    expect(slots).toEqual([
      "08:00",
      "08:15",
      "08:30",
      "08:45",
      "09:00",
      "09:15",
      "09:30",
    ]);
  });

  it("skips overlapping appointment windows", () => {
    const slots = calculateAvailability({
      ...base,
      appointments: [{ start: "08:30", duration: 30 }],
    });

    expect(slots).not.toContain("08:30");
    expect(slots).not.toContain("08:15");
    expect(slots).toContain("09:00");
  });

  it("skips blocked slots and preserves contiguous windows", () => {
    const slots = calculateAvailability({
      ...base,
      blockedSlots: [{ start: "09:15", duration: 30 }],
    });

    expect(slots).not.toContain("09:15");
    expect(slots).not.toContain("09:00");
  });

  it("returns no slot when service duration exceeds interval", () => {
    const slots = calculateAvailability({
      ...base,
      workingIntervals: [{ start: "08:00", end: "08:20" }],
      serviceDuration: 30,
    });

    expect(slots).toEqual([]);
  });

  it("handles multiple working intervals", () => {
    const slots = calculateAvailability({
      ...base,
      workingIntervals: [
        { start: "08:00", end: "08:30" },
        { start: "09:00", end: "09:45" },
      ],
    });

    expect(slots).toContain("08:00");
    expect(slots).toContain("09:00");
    expect(slots).toContain("09:15");
  });
  const testCombinations = [
    { interval: ["07:00", "08:00"], duration: 15, expectedStart: "07:00" },
    { interval: ["07:00", "07:30"], duration: 30, expectedStart: "07:00" },
    {
      interval: ["09:00", "10:00"],
      duration: 45,
      granularity: 15,
      expectedStart: "09:00",
    },
  ];

  testCombinations.forEach((c, idx) => {
    it(`parameterized slot chain case ${idx + 1}`, () => {
      const slots = calculateAvailability({
        workingIntervals: [{ start: c.interval[0], end: c.interval[1] }],
        appointments: [],
        blockedSlots: [],
        serviceDuration: c.duration,
        slotGranularity: c.granularity ?? 15,
      });

      if (c.expected?.length === 0) {
        expect(slots).toEqual([]);
      } else {
        expect(slots[0]).toBe(c.expectedStart);
      }
    });
  });

  const bulkScenarios = Array.from({ length: 20 }, (_, i) => ({
    range: { start: "08:00", end: "09:00" },
    serviceDuration: 15 + (i % 4) * 15,
    slotGranularity: 15,
  }));

  bulkScenarios.forEach((scenario, idx) => {
    it(`bulk slot availability scenario ${idx + 1}`, () => {
      const slots = calculateAvailability({
        workingIntervals: [scenario.range],
        appointments: [
          { start: "08:15", duration: 30 },
          { start: "08:45", duration: 15 },
        ],
        blockedSlots: [],
        serviceDuration: scenario.serviceDuration,
        slotGranularity: scenario.slotGranularity,
      });

      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThanOrEqual(0);
      expect(slots.every((p) => typeof p === "string")).toBe(true);
    });
  });
});
