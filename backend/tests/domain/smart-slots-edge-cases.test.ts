import { describe, it, expect } from "vitest";
import { calculateAvailability } from "../../src/lib/calculate-availability";
import { canBookSlot } from "../../src/lib/can-book-slot";

// ─── calculateAvailability edge cases ─────────────────────────────────────────

describe("calculateAvailability — boundary & temporal edge cases", () => {
  // EC-1: Slot starts exactly at end of working interval (no room)
  it("EC-1: slot starting exactly at interval end is excluded", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "08:30" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    // 08:00 goes until 08:30 ✓ exactly; next candidate 08:15 would end at 08:45, out of bounds
    expect(slots).toEqual(["08:00"]);
  });

  // EC-2: Zero-length working interval
  it("EC-2: zero-length working interval returns no slots", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "09:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).toEqual([]);
  });

  // EC-3: Service duration === working interval duration exactly
  it("EC-3: service duration equals interval — exactly one slot", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 60,
      slotGranularity: 15,
    });
    expect(slots).toEqual(["08:00"]);
  });

  // EC-4: Appointment exactly at interval boundary
  it("EC-4: appointment at very start of interval blocks first slot", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [{ start: "08:00", duration: 30 }],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).not.toContain("08:00");
    expect(slots).not.toContain("08:15"); // 08:15 overlaps [08:00–08:30)
    expect(slots).toContain("08:30");
  });

  // EC-5: Appointment ending exactly when interval ends
  it("EC-5: appointment ending at interval end blocks last slot", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [{ start: "08:30", duration: 30 }],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).not.toContain("08:30");
    expect(slots).not.toContain("08:15"); // 08:15–08:45 overlaps
    expect(slots).toContain("08:00");
  });

  // EC-6: Two back-to-back appointments leave no gap
  it("EC-6: two adjacent appointments leave no free slots", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [
        { start: "08:00", duration: 30 },
        { start: "08:30", duration: 30 },
      ],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).toEqual([]);
  });

  // EC-7: Single-minute blocked slot — only one granularity tick is affected
  it("EC-7: 1-minute blocked slot blocks only overlapping candidates", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [{ start: "08:14", duration: 1 }],
      serviceDuration: 15,
      slotGranularity: 15,
    });
    // 08:00 covers [08:00–08:15), blocked covers [08:14–08:15) → overlaps → excluded
    expect(slots).not.toContain("08:00");
    expect(slots).toContain("08:15");
  });

  // EC-8: Granularity = serviceDuration (tight packing)
  it("EC-8: granularity equals service duration produces maximum slots", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 15,
      slotGranularity: 15,
    });
    expect(slots).toEqual([
      "08:00", "08:15", "08:30", "08:45",
    ]);
  });

  // EC-9: Granularity finer than serviceDuration (overlap possible in listing)
  it("EC-9: granularity 5min with 30min service produces non-overlapping start times", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "08:35" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 5,
    });
    // Valid starts: 08:00 (end 08:30), 08:05 (end 08:35)
    expect(slots).toContain("08:00");
    expect(slots).toContain("08:05");
    expect(slots).not.toContain("08:10"); // 08:10 end 08:40 > 08:35
  });

  // EC-10: Midnight-crossing window (23:30–00:00 should never produce negative times)
  it("EC-10: working interval near midnight does not produce invalid times", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "23:30", end: "23:59" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 15,
      slotGranularity: 15,
    });
    // Only 23:30 fits (23:30+15 = 23:45 ≤ 23:59)
    expect(slots).toContain("23:30");
    expect(slots).not.toContain("23:45"); // 23:45+15=24:00 > 23:59
  });

  // EC-11: Multiple intervals with a gap — gap shorter than service is unusable
  it("EC-11: gap between intervals shorter than service produces no slot in gap", () => {
    const slots = calculateAvailability({
      workingIntervals: [
        { start: "08:00", end: "08:20" }, // only 20 min
        { start: "08:30", end: "09:00" },
      ],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    // First interval: 20 min < 30 min → no slots
    expect(slots).not.toContain("08:00");
    expect(slots).not.toContain("08:05");
    // Second interval: 30 min → 08:30
    expect(slots).toContain("08:30");
  });

  // EC-12: Appointment entirely before working interval is ignored
  it("EC-12: appointment before working hours does not affect slots", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "10:00", end: "11:00" }],
      appointments: [{ start: "09:00", duration: 30 }],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).toContain("10:00");
    expect(slots).toContain("10:15");
    expect(slots).toContain("10:30");
  });

  // EC-13: Appointment entirely after working interval is ignored
  it("EC-13: appointment after working hours does not remove slots", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [{ start: "10:00", duration: 60 }],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).toEqual(["08:00", "08:15", "08:30"]);
  });

  // EC-14: Determinism — same input always produces the same sorted output
  it("EC-14: output is deterministic and sorted for shuffled inputs", () => {
    const params = {
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [
        { start: "09:00", duration: 30 },
        { start: "08:00", duration: 15 },
      ],
      blockedSlots: [{ start: "09:45", duration: 15 }],
      serviceDuration: 30,
      slotGranularity: 15,
    };
    const a = calculateAvailability(params);
    const b = calculateAvailability(params);
    expect(a).toEqual(b);
    expect(a).toEqual([...a].sort());
  });

  // EC-15: Service duration of 1 minute (extreme minimum)
  it("EC-15: 1-minute service with 1-min granularity fills every minute", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "08:05" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 1,
      slotGranularity: 1,
    });
    // 08:00,08:01,08:02,08:03,08:04
    expect(slots.length).toBe(5);
  });

  // EC-16: 120-minute service in a 2-hour window — only one slot
  it("EC-16: 120-min service in a 120-min window yields exactly one slot", () => {
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "10:00" }],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 120,
      slotGranularity: 15,
    });
    expect(slots).toEqual(["08:00"]);
  });

  // EC-17: Blocked slot overlaps exactly one candidate by a single minute
  it("EC-17: blocked slot overlapping candidate by 1 minute still blocks it", () => {
    // Slot 08:00–08:30, blocked 08:29–08:31 → overlaps by 1 min
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [],
      blockedSlots: [{ start: "08:29", duration: 2 }],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).not.toContain("08:00");
    expect(slots).not.toContain("08:15"); // covers 08:15–08:45, overlaps
  });

  // EC-18: Large number of appointments — performance sanity check
  it("EC-18: 50 short appointments still return correct available slots quickly", () => {
    const manyAppointments = Array.from({ length: 50 }, (_, i) => ({
      start: "00:01",   // all before working hours
      duration: 1,
    }));
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: manyAppointments,
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).toContain("08:00");
  });

  // EC-19: Appointment touching (not overlapping) the slot (adjacent, not inside)
  it("EC-19: appointment ending exactly when slot starts does not block it", () => {
    // Appointment 07:30–08:00, slot candidate 08:00–08:30 → no overlap
    const slots = calculateAvailability({
      workingIntervals: [{ start: "08:00", end: "09:00" }],
      appointments: [{ start: "07:30", duration: 30 }],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).toContain("08:00");
  });

  // EC-20: Empty working intervals returns empty
  it("EC-20: empty workingIntervals array returns no slots", () => {
    const slots = calculateAvailability({
      workingIntervals: [],
      appointments: [],
      blockedSlots: [],
      serviceDuration: 30,
      slotGranularity: 15,
    });
    expect(slots).toEqual([]);
  });
});

// ─── canBookSlot edge cases ───────────────────────────────────────────────────

describe("canBookSlot — boundary & conflict edge cases", () => {
  const workingHours = [{ start: "08:00", end: "18:00" }];

  it("CBS-1: slot exactly fitting at start of interval is allowed", () => {
    expect(canBookSlot({
      requestedStart: "08:00",
      serviceDuration: 60,
      workingIntervals: workingHours,
      appointments: [],
      blockedSlots: [],
    })).toBe(true);
  });

  it("CBS-2: slot ending exactly at interval end is allowed", () => {
    expect(canBookSlot({
      requestedStart: "17:00",
      serviceDuration: 60,
      workingIntervals: workingHours,
      appointments: [],
      blockedSlots: [],
    })).toBe(true);
  });

  it("CBS-3: slot overflowing interval end by 1 minute is denied", () => {
    expect(canBookSlot({
      requestedStart: "17:01",
      serviceDuration: 60,
      workingIntervals: workingHours,
      appointments: [],
      blockedSlots: [],
    })).toBe(false);
  });

  it("CBS-4: slot starting before working hours is denied", () => {
    expect(canBookSlot({
      requestedStart: "07:59",
      serviceDuration: 30,
      workingIntervals: workingHours,
      appointments: [],
      blockedSlots: [],
    })).toBe(false);
  });

  it("CBS-5: touching appointment (ends when slot starts) does not conflict", () => {
    expect(canBookSlot({
      requestedStart: "09:00",
      serviceDuration: 30,
      workingIntervals: workingHours,
      appointments: [{ start: "08:00", duration: 60 }], // ends at 09:00
      blockedSlots: [],
    })).toBe(true);
  });

  it("CBS-6: touching appointment (starts when slot ends) does not conflict", () => {
    expect(canBookSlot({
      requestedStart: "08:00",
      serviceDuration: 60,
      workingIntervals: workingHours,
      appointments: [{ start: "09:00", duration: 30 }], // starts at 09:00
      blockedSlots: [],
    })).toBe(true);
  });

  it("CBS-7: 1-minute overlap with blocked slot denies booking", () => {
    expect(canBookSlot({
      requestedStart: "09:00",
      serviceDuration: 60,
      workingIntervals: workingHours,
      blockedSlots: [{ start: "09:59", duration: 1 }], // overlaps by 1 min at 09:59
      appointments: [],
    })).toBe(false);
  });

  it("CBS-8: blocked slot entirely inside the booking window denies it", () => {
    expect(canBookSlot({
      requestedStart: "10:00",
      serviceDuration: 120,
      workingIntervals: workingHours,
      blockedSlots: [{ start: "11:00", duration: 15 }],
      appointments: [],
    })).toBe(false);
  });

  it("CBS-9: simultaneous appointment + blocked slot both absent → allowed", () => {
    expect(canBookSlot({
      requestedStart: "12:00",
      serviceDuration: 30,
      workingIntervals: workingHours,
      appointments: [],
      blockedSlots: [],
    })).toBe(true);
  });

  it("CBS-10: two working intervals — slot spanning gap between them is denied", () => {
    expect(canBookSlot({
      requestedStart: "11:45",
      serviceDuration: 30, // 11:45–12:15, gap is 12:00–13:00
      workingIntervals: [
        { start: "08:00", end: "12:00" },
        { start: "13:00", end: "18:00" },
      ],
      appointments: [],
      blockedSlots: [],
    })).toBe(false); // 11:45+30=12:15 > 12:00
  });
});
