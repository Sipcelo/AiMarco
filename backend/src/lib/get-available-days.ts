import { supabase } from './supabase.js';

/**
 * Returns the next available booking days for a professional,
 * based on their active availability_rules.
 */
export async function getAvailableDays(
  professionalId: string,
  count: number = 14
): Promise<string[]> {
  const { data: rules, error } = await supabase
    .from('availability_rules')
    .select('day_of_week')
    .eq('professional_id', professionalId)
    .eq('is_active', true);

  if (error) throw error;

  const workingDays = new Set((rules || []).map((r) => r.day_of_week));

  if (workingDays.size === 0) return [];

  const days: string[] = [];
  const date = new Date();

  while (days.length < count) {
    const dow = date.getUTCDay();
    if (workingDays.has(dow)) {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      days.push(`${yyyy}-${mm}-${dd}`);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return days;
}
