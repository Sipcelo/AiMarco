import { supabase } from './supabase.js';

export async function notifyProfessionalNewAppointment(
  professionalId: string,
  clientName: string,
  serviceName: string,
  scheduledAt: string,
): Promise<void> {
  try {
    const { data } = await supabase
      .from('professionals')
      .select('push_token')
      .eq('id', professionalId)
      .single();

    const pushToken = data?.push_token as string | null;
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

    const time = new Date(scheduledAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: '📅 Novo agendamento!',
        body: `${clientName} marcou ${serviceName} às ${time}`,
        data: { professional_id: professionalId, type: 'new_appointment' },
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch {
    // fire-and-forget — não bloqueia o fluxo de agendamento
  }
}
