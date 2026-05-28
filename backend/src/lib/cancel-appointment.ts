import { supabase } from './supabase.js';

/**
 * Calls the atomic database RPC to cancel an appointment.
 */
export async function cancelAppointment(appointmentId: string) {
  const { data, error } = await supabase.rpc('cancel_appointment_v1', {
    p_appointment_id: appointmentId,
  });

  if (error) {
    if (
      error.message === 'Appointment not found.' ||
      error.message === 'Appointment cannot be cancelled.'
    ) {
      throw new Error(error.message);
    }
    throw error;
  }

  return data;
}
