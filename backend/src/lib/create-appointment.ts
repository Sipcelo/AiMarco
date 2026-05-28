import { supabase } from './supabase.js';

export interface CreateAppointmentParams {
  professionalId: string;
  serviceId: string;
  scheduledAt: string; // ISO String "YYYY-MM-DDTHH:mm:ssZ"
  clientName: string;
  clientPhone: string;
}

/**
 * Calls the atomic database RPC to create an appointment.
 */
export async function createAppointment(params: CreateAppointmentParams) {
  const { professionalId, serviceId, scheduledAt, clientName, clientPhone } = params;

  const { data, error } = await supabase.rpc('create_appointment_v1', {
    p_professional_id: professionalId,
    p_service_id: serviceId,
    p_scheduled_at: scheduledAt,
    p_client_name: clientName,
    p_client_phone: clientPhone,
  });

  if (error) {
    if (
      error.message === 'Service not found or does not belong to the professional.' ||
      error.message === 'Selected slot is no longer available.'
    ) {
      throw new Error(error.message);
    }
    throw error;
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return data;
}
