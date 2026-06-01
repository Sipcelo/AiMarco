import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { updateAppointmentStatus } from '../../../lib/update-appointment-status.js';
import { toProfessionalAppointment } from '../../../dtos/index.js';

import type { AuthContext } from '../../../middleware/auth.js';

export async function updateStatusHandler(
  req: IncomingMessage & { auth?: AuthContext; body?: any },
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

    const parsed = req.body;
    if (!parsed || typeof parsed !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }
    const { status } = parsed;

    if (status !== 'completed' && status !== 'no_show') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Status deve ser completed ou no_show' }));
      return;
    }

    try {
      const updated = await updateAppointmentStatus(appointmentId, status);
      const safeAppointment = toProfessionalAppointment(updated);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(safeAppointment));
    } catch (err: any) {
      if (err.message === 'Appointment not found.') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      if (err.message.startsWith('Cannot transition from')) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      console.error('[update-status] erro inesperado:', {
        message: err?.message, code: err?.code, details: err?.details, hint: err?.hint,
      });
      const diag = [err?.message, err?.code && `(${err.code})`].filter(Boolean).join(' ');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: diag ? `Erro ao atualizar status: ${diag}` : 'Erro interno no servidor.',
        code: err?.code,
      }));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}