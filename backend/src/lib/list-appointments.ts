import { supabase } from './supabase.js';

/**
 * Fetches appointments for a professional on a specific date.
 */
export async function listAppointments(
  professionalId: string,
  date: string // "YYYY-MM-DD"
) {
  const BUSINESS_TZ = 'America/Sao_Paulo';
  const dateRef = new Date(`${date}T12:00:00Z`);
  const tzOffset =
    new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TZ,
      timeZoneName: 'longOffset',
    })
      .formatToParts(dateRef)
      .find((p) => p.type === 'timeZoneName')?.value.replace('GMT', '') ||
    '-03:00';

  const startWindow = `${date}T00:00:00${tzOffset}`;
  const endWindow = `${date}T23:59:59${tzOffset}`;

  // 1. Verify that the professional exists
  const { data: professional, error: profError } = await supabase
    .from('professionals')
    .select('id')
    .eq('id', professionalId)
    .single();

  if (profError || !professional) {
    throw new Error('Professional not found.');
  }

  // 2. Fetch appointments for that professional on the given date
  // IMPORTANTE: Incluir snapshots obrigatórios (architecture.md §7.4)
  // Campos: service_name, service_duration_minutes, client_name, client_phone
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_at:scheduled_start,
      status,
      service_id,
      client_id,
      service_name,
      service_duration_minutes,
      client_name,
      client_phone
    `)
    .eq('professional_id', professionalId)
    .gte('scheduled_start', startWindow)
    .lte('scheduled_start', endWindow)
    .order('scheduled_start', { ascending: true });

  if (apptError) throw apptError;

  return appointments || [];
}
