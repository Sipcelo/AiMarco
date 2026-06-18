import { supabase } from './supabase.js';
import { fromTstzRange, toTstzRange } from './time-range.js';

export async function listBlockedSlots(
  professionalId: string,
  date: string // "YYYY-MM-DD"
) {
  const BUSINESS_TZ = 'America/Sao_Paulo';
  const dateRef = new Date(`${date}T12:00:00Z`);
  const tzOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(dateRef)
    .find((p) => p.type === 'timeZoneName')?.value.replace('GMT', '') || '-03:00';

  const startWindow = `${date}T00:00:00${tzOffset}`;
  const endWindow = `${date}T23:59:59${tzOffset}`;

  const { data, error } = await supabase
    .from('blocked_slots')
    .select('id, time_range, reason')
    .eq('professional_id', professionalId)
    .overlaps('time_range', toTstzRange(startWindow, endWindow))
    .order('time_range', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => {
    const { id, time_range, reason } = row;
    return { id, ...fromTstzRange(time_range), reason };
  });
}
