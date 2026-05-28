import { supabase } from './supabase.js';

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
    .select('id, starts_at, ends_at, reason')
    .eq('professional_id', professionalId)
    .lt('starts_at', endWindow)
    .gt('ends_at', startWindow)
    .order('starts_at', { ascending: true });

  if (error) throw error;

  return data || [];
}
