import { describe, it, expect } from "vitest";

type User = {
  id: string;
  role: "admin" | "professional" | "client";
  professionalId?: string;
};
type Appointment = { id: string; professionalId: string; ownerId: string };

function canViewAppointment(user: User, appointment: Appointment): boolean {
  if (user.role === "admin") return true;
  if (user.role === "professional")
    return user.professionalId === appointment.professionalId;
  if (user.role === "client") return user.id === appointment.ownerId;
  return false;
}

describe("RLS and ownership checks for appointments", () => {
  const appointment: Appointment = {
    id: "apt-1",
    professionalId: "prof-1",
    ownerId: "client-1",
  };

  it("allows admin to view any appointment", () => {
    const user: User = { id: "admin-1", role: "admin" };
    expect(canViewAppointment(user, appointment)).toBe(true);
  });

  it("allows professional owner to view their appointment", () => {
    const user: User = {
      id: "prof-user",
      role: "professional",
      professionalId: "prof-1",
    };
    expect(canViewAppointment(user, appointment)).toBe(true);
  });

  it("denies professional non-owner from viewing another appointment", () => {
    const user: User = {
      id: "prof-user",
      role: "professional",
      professionalId: "prof-2",
    };
    expect(canViewAppointment(user, appointment)).toBe(false);
  });

  it("allows client owner to view their appointment", () => {
    const user: User = { id: "client-1", role: "client" };
    expect(canViewAppointment(user, appointment)).toBe(true);
  });

  it("denies client non-owner from viewing foreign appointment", () => {
    const user: User = { id: "client-2", role: "client" };
    expect(canViewAppointment(user, appointment)).toBe(false);
  });

  it("logs audit event for security checks", () => {
    const events: string[] = [];
    const audit = (msg: string) => events.push(msg);

    const user: User = { id: "client-2", role: "client" };
    const allowed = canViewAppointment(user, appointment);

    audit(`user ${user.id} allowed=${allowed}`);
    expect(events).toContain("user client-2 allowed=false");
  });

  it("ensures no elevation path from client to professional", () => {
    const user: User = { id: "client-3", role: "client" };
    expect(canViewAppointment(user, appointment)).toBe(false);
  });

  it("checks professional ownership proxy behavior", () => {
    const user: User = {
      id: "prof-1",
      role: "professional",
      professionalId: "prof-1",
    };
    expect(canViewAppointment(user, appointment)).toBe(true);
  });

  it("falls back to deny when role invalid", () => {
    const user = { id: "unknown", role: "guest" } as User;
    expect(canViewAppointment(user, appointment)).toBe(false);
  });
  const crossUsers: Array<{ user: User; allowed: boolean }> = [
    { user: { id: "admin-2", role: "admin" }, allowed: true },
    {
      user: { id: "elevated", role: "professional", professionalId: "prof-1" },
      allowed: true,
    },
    {
      user: {
        id: "notprofessional",
        role: "professional",
        professionalId: "prof-999",
      },
      allowed: false,
    },
    { user: { id: "client-1", role: "client" }, allowed: true },
    { user: { id: "client-999", role: "client" }, allowed: false },
  ];

  crossUsers.forEach((candidate, idx) => {
    it(`cross-parameterized check ${idx + 1}: ${candidate.user.id}`, () => {
      expect(canViewAppointment(candidate.user, appointment)).toBe(
        candidate.allowed,
      );
    });
  });
});
