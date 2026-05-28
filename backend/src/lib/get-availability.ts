import { supabase } from './supabase.js';
import { calculateAvailability } from './calculate-availability.js';
import type { OccupiedSlot, TimeInterval } from './calculate-availability.js';

/**
 * Fetches data from Supabase and calculates available slots for a given professional, service and date.
 */
export async function getAvailability(
  professionalId: string,
  serviceId: string,
  date: string, // "YYYY-MM-DD"
  slotGranularityMinutes: number
): Promise<string[]> {
  // Business timezone configuration for MVP
  const BUSINESS_TZ = 'America/Sao_Paulo';

  // Explicitly derive the IANA timezone offset for the requested date.
  // This avoids hardcoding a fixed offset and ensures compliance with America/Sao_Paulo semantics.
  const dateRef = new Date(`${date}T12:00:00Z`);
  const tzOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(dateRef)
    .find((p) => p.type === 'timeZoneName')?.value.replace('GMT', '') || '-03:00';

  // Construct absolute boundaries for the business day in the target timezone
  const startWindow = `${date}T00:00:00${tzOffset}`;
  const endWindow = `${date}T23:59:59${tzOffset}`;
  const windowStartTimestamp = new Date(startWindow).getTime();

  // 1. Validate service and get duration
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('professional_id', professionalId)
    .eq('is_active', true)
    .single();

  if (serviceError || !service) {
    throw new Error('Service not found or does not belong to the professional.');
  }

  // 2. Fetch availability rules (working hours) for the weekday
  // Derive day of week using the local date semantics of the requested business day.
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
  
  const { data: rules, error: rulesError } = await supabase
    .from('availability_rules')
    .select('start_time, end_time')
    .eq('professional_id', professionalId)
    .eq('day_of_week', dayOfWeek);

  if (rulesError) throw rulesError;

  const workingIntervals: TimeInterval[] = (rules || []).map((r) => ({
    start: r.start_time.substring(0, 5),
    end: r.end_time.substring(0, 5),
  }));

  // 3. Fetch blocked slots with overlap logic (using absolute windows)
  const { data: blocked, error: blockedError } = await supabase
    .from('blocked_slots')
    .select('starts_at, ends_at')
    .eq('professional_id', professionalId)
    .lt('starts_at', endWindow)
    .gt('ends_at', startWindow);

  if (blockedError) throw blockedError;

  const blockedSlots: OccupiedSlot[] = (blocked || []).map((b) => {
    const bStart = new Date(b.starts_at).getTime();
    const bEnd = new Date(b.ends_at).getTime();
    const wStart = windowStartTimestamp;
    const wEnd = new Date(endWindow).getTime();

    const actualStart = Math.max(bStart, wStart);
    const actualEnd = Math.min(bEnd, wEnd);

    // Calculate minutes from the start of the business day in the local timezone
    const startMinutes = Math.floor((actualStart - wStart) / 60000);
    const duration = Math.floor((actualEnd - actualStart) / 60000);

    const h = Math.floor(startMinutes / 60).toString().padStart(2, '0');
    const m = (startMinutes % 60).toString().padStart(2, '0');

    return { start: `${h}:${m}`, duration };
  });

  // 4. Fetch confirmed appointments (using absolute windows)
  const { data: appts, error: apptError } = await supabase
    .from('appointments')
    .select('scheduled_start, services(duration_minutes)')
    .eq('professional_id', professionalId)
    .eq('status', 'confirmed')
    .gte('scheduled_start', startWindow)
    .lte('scheduled_start', endWindow);

  if (apptError) throw apptError;

  const appointments: OccupiedSlot[] = (appts || []).map((a: any) => {
    const startTs = new Date(a.scheduled_start).getTime();
    // Minutes from the start of the local business day to maintain wall-clock alignment
    const startMinutes = Math.floor((startTs - windowStartTimestamp) / 60000);
    const h = Math.floor(startMinutes / 60).toString().padStart(2, '0');
    const m = (startMinutes % 60).toString().padStart(2, '0');

    return {
      start: `${h}:${m}`,
      duration: a.services.duration_minutes,
    };
  });

  // 5. Run pure calculation
  return calculateAvailability({
    workingIntervals,
    appointments,
    blockedSlots,
    serviceDuration: service.duration_minutes,
    slotGranularity: slotGranularityMinutes,
  });
}
