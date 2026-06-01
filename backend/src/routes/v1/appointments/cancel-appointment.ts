import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { cancelAppointment } from '../../../lib/cancel-appointment.js';
import { toProfessionalAppointment } from '../../../dtos/index.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function cancelAppointmentHandler(
  req: IncomingMessage & { auth?: AuthContext },
  res: ServerResponse,
  params: Record<string, string>
) {
  const appointmentId = params.id;
  const auth = req.auth;

  try {
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('professional_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Agendamento não encontrado.' }));
      return;
    }

    // Ownership check
    if (!auth || auth.professionalId !== appointment.professional_id) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
      return;
    }

    const updated = await cancelAppointment(appointmentId);
    // Aplicar DTO
    const safeAppointment = toProfessionalAppointment(updated)!;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(safeAppointment));
  } catch (err: any) {
    if (err.message === 'Appointment not found.') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    if (err.message === 'Appointment cannot be cancelled.') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    // Erro inesperado (ex.: falha de RPC/coluna no banco). Logar o detalhe completo
    // no servidor e devolver um diagnóstico seguro (sem PII) para acelerar a correção.
    console.error('[cancel] erro inesperado ao cancelar agendamento:', {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
    });
    const diag = [err?.message, err?.code && `(${err.code})`].filter(Boolean).join(' ');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: diag ? `Erro ao cancelar: ${diag}` : 'Erro interno no servidor.',
      code: err?.code,
    }));
  }
}