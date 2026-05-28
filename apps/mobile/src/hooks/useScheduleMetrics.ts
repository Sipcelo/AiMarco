import { useMemo } from 'react';

type Appointment = {
  id: string;
  status: string;
  scheduled_at: string;
  client_name?: string;
  service_name?: string;
};

type BlockedSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
};

type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

type User = {
  id?: string;
  display_name?: string;
};

export function useScheduleMetrics(
  appointments: Appointment[],
  weekAppointments: Record<string, Appointment[]>,
  weekBlockedSlots: Record<string, BlockedSlot[]>,
  availabilityRules: AvailabilityRule[],
  selectedDate: string,
  user: User | null,
) {
  const stats = useMemo(() => {
    const dayAppts = appointments || [];
    return {
      total: dayAppts.length,
      confirmed: dayAppts.filter(a => a.status === 'confirmed').length,
      completed: dayAppts.filter(a => a.status === 'completed').length,
      cancelled: dayAppts.filter(a => a.status === 'cancelled').length,
    };
  }, [appointments]);

  const revenue = useMemo(() => {
    const confirmed = (appointments || []).filter(a => a.status === 'confirmed');
    return confirmed.length * 50; // placeholder
  }, [appointments]);

  const confirmedClientCount = useMemo(() => {
    const names = new Set(
      (appointments || [])
        .filter(a => a.status === 'confirmed' && a.client_name)
        .map(a => a.client_name)
    );
    return names.size;
  }, [appointments]);

  const weekOccupancy = useMemo(() => {
    const totalSlots = Object.values(weekAppointments).reduce(
      (sum, arr) => sum + arr.length, 0
    );
    const totalBlocked = Object.values(weekBlockedSlots).reduce(
      (sum, arr) => sum + arr.length, 0
    );
    const capacity = availabilityRules.length * 7; // rough estimate
    if (capacity === 0) return 0;
    return Math.min(((totalSlots + totalBlocked) / capacity) * 100, 100);
  }, [weekAppointments, weekBlockedSlots, availabilityRules]);

  const nextAppointment = useMemo(() => {
    const now = new Date();
    return (appointments || [])
      .filter(a => a.status === 'confirmed' && new Date(a.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  }, [appointments]);

  return { stats, revenue, confirmedClientCount, weekOccupancy, nextAppointment };
}
