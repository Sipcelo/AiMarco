import { supabase } from './supabase.js';
import { fromTstzRange, toTstzRange } from './time-range.js';

export async function createBlockedSlot(
  professionalId: string,
  startsAt: string,
  endsAt: string,
  reason?: string
) {
  // Validate that starts_at is before ends_at
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Formato de data inválido.');
  }

  if (start >= end) {
    throw new Error('O horário de início deve ser anterior ao horário de fim.');
  }

  // Check for overlapping blocked slots
  const { data: existing, error: checkError } = await supabase
    .from('blocked_slots')
    .select('id')
    .eq('professional_id', professionalId)
    .overlaps('time_range', toTstzRange(startsAt, endsAt));

  if (checkError) throw checkError;

  if (existing && existing.length > 0) {
    throw new Error('Este período conflita com um bloqueio já existente.');
  }

  // Check for conflicting confirmed appointments
  const { data: conflicting, error: conflictError } = await supabase
    .from('appointments')
    .select('id, scheduled_start')
    .eq('professional_id', professionalId)
    .eq('status', 'confirmed')
    .lt('scheduled_start', endsAt)
    .gte('scheduled_start', startsAt);

  if (conflictError) throw conflictError;

  const { data, error } = await supabase
    .from('blocked_slots')
    .insert({
      professional_id: professionalId,
      time_range: toTstzRange(startsAt, endsAt),
      reason: reason || null,
    })
    .select('id, time_range, reason')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    ...fromTstzRange(data.time_range),
    reason: data.reason,
    warnings:
      conflicting && conflicting.length > 0
        ? `Atenção: ${conflicting.length} agendamento(s) confirmado(s) neste período. Verifique e cancele manualmente se necessário.`
        : null,
  };
}
