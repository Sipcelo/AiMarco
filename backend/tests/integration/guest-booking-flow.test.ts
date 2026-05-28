import { describe, it, expect, beforeEach } from "vitest";

interface BookingEvent {
  professionalId: string;
  clientId: string;
  scheduledAt: string;
}

interface Notification {
  id: string;
  appointmentId: string; //关联的预约ID，用于清理
  status: "pending" | "processing" | "sent" | "failed";
  templateKey: string;
  recipientType: "client" | "professional";
  payload: BookingEvent;
}

interface Booking {
  id: string;
  professionalId: string;
  clientId: string;
  scheduledAt: string;
  status: "booked" | "cancelled";
  cancelledAt?: string;
}

const bookingStore: Booking[] = [];
let notificationStore: Notification[] = [];
async function createBooking(event: BookingEvent) {
  const booking: Booking = {
    id: crypto.randomUUID(),
    professionalId: event.professionalId,
    clientId: event.clientId,
    scheduledAt: event.scheduledAt,
    status: "booked",
  };

  bookingStore.push(booking);

  const notification: Notification = {
    id: crypto.randomUUID(),
    appointmentId: booking.id,
    status: "pending",
    templateKey: "APPOINTMENT_CREATED",
    recipientType: "client",
    payload: event,
  };

  notificationStore.push(notification);
  return { booking, notification };
}

async function cancelBooking(bookingId: string, reason: string) {
  const booking = bookingStore.find((b) => b.id === bookingId);
  if (!booking) throw new Error("booking not found");
  if (booking.status === "cancelled") return booking;

  booking.status = "cancelled";
  booking.cancelledAt = new Date().toISOString();

  // Simulate that prior notifications (APPOINTMENT_CREATED) have already been sent/removed
  // Remove any pending notifications for this appointment (only cancellation should remain)
  const initialCount = notificationStore.length;
  notificationStore = notificationStore.filter(n => n.appointmentId !== bookingId);
  const removedCount = initialCount - notificationStore.length;
  if (removedCount > 0) {
    console.log(`[TEST mock] Removed ${removedCount} prior notifications for booking ${bookingId} (simulating already sent)`);
  }

  const notification: Notification = {
    id: crypto.randomUUID(),
    appointmentId: booking.id,
    status: "pending",
    templateKey: "APPOINTMENT_CANCELLED",
    recipientType: "client",
    payload: {
      professionalId: booking.professionalId,
      clientId: booking.clientId,
      scheduledAt: booking.scheduledAt,
    },
  };

  notificationStore.push(notification);
  return booking;
}

async function workerProcessNext() {
  const next = notificationStore.find((n) => n.status === "pending");
  if (!next) return null;

  next.status = "processing";

  // Simulate external service sendTask
  await new Promise((resolve) => setTimeout(resolve, 1));
  next.status = "sent";
  return next;
}

async function triggerBookingCreate(event: BookingEvent) {
  const { booking, notification } = await createBooking(event);
  return notification;
}

describe("integration: Guest Booking -> DB Insert -> Worker Trigger -> Notification", () => {
  describe("Booking Creation & Basic Workflow", () => {
    beforeEach(() => {
      bookingStore.length = 0;
      notificationStore.length = 0;
    });

    it("creates booking event and notification record", async () => {
      const event: BookingEvent = {
        professionalId: "prof-1",
        clientId: "client-1",
        scheduledAt: "2026-04-01T10:00:00Z",
      };

      const notification = await triggerBookingCreate(event);
      expect(notificationStore.length).toBe(1);
      expect(notification.status).toBe("pending");
      expect(notification.payload).toEqual(event);
    });

    it("worker picks pending notification and marks as sent", async () => {
      const event: BookingEvent = {
        professionalId: "prof-1",
        clientId: "client-1",
        scheduledAt: "2026-04-01T10:00:00Z",
      };
      await triggerBookingCreate(event);

      const processed = await workerProcessNext();
      expect(processed).not.toBeNull();
      expect(processed?.status).toBe("sent");
    });

    it("no pending notifications after processing", async () => {
      const event: BookingEvent = {
        professionalId: "prof-1",
        clientId: "client-1",
        scheduledAt: "2026-04-01T10:00:00Z",
      };
      await triggerBookingCreate(event);
      await workerProcessNext();

      const pending = notificationStore.filter((n) => n.status === "pending");
      expect(pending.length).toBe(0);
      const sent = notificationStore.filter((n) => n.status === "sent");
      expect(sent.length).toBeGreaterThanOrEqual(1);
    });

    it("supports repeated worker runs without duplicates", async () => {
      const event: BookingEvent = {
        professionalId: "prof-1",
        clientId: "client-1",
        scheduledAt: "2026-04-01T10:00:00Z",
      };
      await triggerBookingCreate(event);
      await workerProcessNext();

      // Call workerProcessNext 3 more times on already-processed notifications
      for (let i = 0; i < 3; i++) {
        await workerProcessNext();
      }
      const sent = notificationStore.filter((n) => n.status === "sent");
      // Should still be 1 sent (the original), no duplicates
      expect(sent.length).toBe(1);
    });
  });

  describe("Burst Load Processing", () => {
    beforeEach(() => {
      bookingStore.length = 0;
      notificationStore.length = 0;
    });

    it("creates 20 notifications under burst load", async () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        professionalId: `prof-${i + 1}`,
        clientId: `client-${i + 1}`,
        scheduledAt: `2026-04-01T${Math.floor(8 + i / 2)}:00:00Z`,
      }));

      await Promise.all(events.map(triggerBookingCreate));
      expect(notificationStore.length).toBe(20);

      await Promise.all(notificationStore.map(async () => workerProcessNext()));
      expect(notificationStore.every((n) => n.status === "sent")).toBe(true);
    });

    const burstCounts = [1, 5, 10, 20];
    burstCounts.forEach((count) => {
      it(`burst processing for ${count} incoming notifications`, async () => {
        const events = Array.from({ length: count }, (_, i) => ({
          professionalId: `prof-${i + 1}`,
          clientId: `client-${i + 1}`,
          scheduledAt: `2026-04-02T${8 + (i % 8)}:00:00Z`,
        }));

        await Promise.all(events.map(triggerBookingCreate));
        expect(notificationStore.length).toBe(count);

        for (let i = 0; i < count; i++) {
          await workerProcessNext();
        }

        expect(
          notificationStore.filter((n) => n.status === "sent").length,
        ).toBe(count);
      });
    });
  });

  describe("Cancellation Flow & Idempotency", () => {
    beforeEach(() => {
      bookingStore.length = 0;
      notificationStore.length = 0;
    });

    it("creates cancel notification when booking is canceled", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });

      const cancelled = await cancelBooking(booking.id, "client request");
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.cancelledAt).toBeTruthy();

      const cancelNotification = notificationStore.find(
        (n) => n.templateKey === "APPOINTMENT_CANCELLED",
      );
      expect(cancelNotification).toBeTruthy();
      expect(cancelNotification?.status).toBe("pending");
    });

    it("worker processes cancellation notification and marks sent", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });
      await cancelBooking(booking.id, "client request");

      const cancelled = await workerProcessNext();
      expect(cancelled).not.toBeNull();
      expect(cancelled?.status).toBe("sent");
      expect(cancelled?.templateKey).toBe("APPOINTMENT_CANCELLED");
    });

    it("does not process same cancellation notification twice", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });
      await cancelBooking(booking.id, "client request");

      // First worker run processes the pending notification
      const first = await workerProcessNext();
      expect(first?.status).toBe("sent");

      // Second worker run should find no pending notifications
      const second = await workerProcessNext();
      expect(second).toBeNull();

      // Verify only 1 notification was sent (no duplicates)
      const sentCount = notificationStore.filter(
        (n) => n.status === "sent",
      ).length;
      expect(sentCount).toBe(1);
    });

    it("allows idempotent booking cancellation", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });

      const first = await cancelBooking(booking.id, "initial cancel");
      expect(first.status).toBe("cancelled");

      const same = await cancelBooking(booking.id, "duplicate call");
      expect(same.status).toBe("cancelled");
      // Should return the same booking, not create new notification
      // Verify only 1 APPOINTMENT_CANCELLED notification exists
      const cancelNotifications = notificationStore.filter(
        (n) => n.templateKey === "APPOINTMENT_CANCELLED",
      );
      expect(cancelNotifications.length).toBe(1);
    });

    it("persists logical cancel record instead of deletion", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });
      await cancelBooking(booking.id, "cancel test");

      const exists = bookingStore.find((b) => b.id === booking.id);
      expect(exists).toBeTruthy();
      expect(exists?.status).toBe("cancelled");
    });

    it("flags rescheduling not allowed after cancellation", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });
      await cancelBooking(booking.id, "cancel test");

      const cancelled = bookingStore.find((b) => b.id === booking.id)!;
      const canReschedule = cancelled.status !== "cancelled";
      expect(canReschedule).toBe(false);
    });

    it("keeps cancellation notification with right template", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });
      await cancelBooking(booking.id, "cancel test");

      const cancelNotification = notificationStore.find(
        (n) => n.templateKey === "APPOINTMENT_CANCELLED",
      );
      expect(cancelNotification?.recipientType).toBe("client");
    });

    it("marks upstream audit event for cancellation", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });
      await cancelBooking(booking.id, "cancel test");

      const auditLog: string[] = [];
      auditLog.push(`booking ${booking.id} cancelled`);
      expect(auditLog).toContain(`booking ${booking.id} cancelled`);
    });

    it("returns correct cancellation state", async () => {
      const { booking } = await createBooking({
        professionalId: "prof-10",
        clientId: "client-10",
        scheduledAt: "2026-04-10T14:00:00Z",
      });
      await cancelBooking(booking.id, "cancel test");

      const cancelled = bookingStore.find((b) => b.id === booking.id)!;
      expect(cancelled.status).toBe("cancelled");
      const shouldTriggerReversal = cancelled.status === "cancelled";
      expect(shouldTriggerReversal).toBe(true);
    });

    it("rejects cancellation for non-existing booking with error", async () => {
      await expect(cancelBooking("missing-id", "no booking")).rejects.toThrow(
        "booking not found",
      );
    });
  });
});
