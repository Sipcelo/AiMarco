import { supabase } from './supabase.js';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['completed', 'no_show'],
};

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'completed' | 'no_show'
) {
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .single();

  if (fetchError || !appointment) {
    throw new Error('Appointment not found.');
  }

  const allowed = ALLOWED_TRANSITIONS[appointment.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${appointment.status} to ${newStatus}.`);
  }

  const updateFields: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  const { data, error: updateError } = await supabase
    .from('appointments')
    .update(updateFields)
    .eq('id', appointmentId)
    .select()
    .single();

  if (updateError) throw updateError;

  return data;
}
