import { IncomingMessage, ServerResponse } from 'node:http';
import { listAppointments } from '../../../lib/list-appointments.js';
import { toProfessionalAppointmentList } from '../../../dtos/index.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function listAppointmentsHandler(
  req: IncomingMessage & { auth?: AuthContext },
  res: ServerResponse,
  params: Record<string, string>
) {
  const professional_id = params.id;
  const auth = req.auth;

  // Ownership check
  if (!auth || auth.professionalId !== professional_id) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
    return;
  }

  const [_, query] = (req.url || '').split('?');
  const urlParams = new URLSearchParams(query);
  const date = urlParams.get('date');
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!professional_id || !date || !dateRegex.test(date)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Dados de entrada inválidos.' }));
    return;
  }

  try {
    const appointments = await listAppointments(professional_id, date);
    // Aplicar DTO para garantir que não expomos objetos crus
    const safeAppointments = toProfessionalAppointmentList(appointments);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(safeAppointments));
  } catch (err: any) {
    console.error('❌ [LIST_APPOINTMENTS] Erro fatal:', {
      message: err?.message,
      code:    err?.code,
      details: err?.details,
      hint:    err?.hint,
      stack:   err?.stack,
    });
    if (err.message === 'Professional not found.') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}