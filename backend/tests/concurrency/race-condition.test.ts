import { describe, it, expect } from "vitest";

describe("race condition booking simulation (50 concurrent)", () => {
  type Booking = { slot: string; userId: string };

  const bookedSlots = new Set<string>();

  async function bookSlot(slot: string, userId: string): Promise<boolean> {
    // simulate non-atomic check + write (race window)
    await new Promise((res) => setTimeout(res, Math.random() * 5));

    if (bookedSlots.has(slot)) return false;

    bookedSlots.add(slot);
    return true;
  }

  it("ensures only one booking per slot under 50 parallel attempts", async () => {
    bookedSlots.clear();
    const slot = "2026-03-25T10:00:00Z";

    const attempts = Array.from({ length: 50 }, (_, i) =>
      bookSlot(slot, `user-${i + 1}`),
    );

    const results = await Promise.all(attempts);

    const successCount = results.filter((x) => x).length;
    expect(successCount).toBe(1);
    expect(bookedSlots.size).toBe(1);
    expect(bookedSlots.has(slot)).toBe(true);
  });

  it("supports 50 unique slot concurrent bookings without conflict", async () => {
    bookedSlots.clear();

    const attempts = Array.from({ length: 50 }, (_, i) =>
      bookSlot(`slot-${i + 1}`, `user-${i + 1}`),
    );

    const results = await Promise.all(attempts);
    const successCount = results.filter(Boolean).length;

    expect(successCount).toBe(50);
    expect(bookedSlots.size).toBe(50);
  });
  const uniqueBookings = Array.from({ length: 20 }, (_, i) => ({
    slot: `shared-slot-${i % 5}`,
    userId: `u${i + 1}`,
  }));

  uniqueBookings.forEach((booking, idx) => {
    it(`sequential non-race safety ${idx + 1}`, async () => {
      bookedSlots.clear();
      const result = await bookSlot(booking.slot, booking.userId);
      expect(result).toBe(true);
    });
  });
});
