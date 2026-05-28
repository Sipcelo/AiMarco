import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { RescheduleRequestSchema } from '../../../shared/index.js';
import { ZodError } from 'zod';
import { toProfessionalAppointment } from '../../../dtos/index.js';
import type { AuthContext } from '../../../middleware/auth.js';

/**
 * Route handler for POST /v1/appointments/:id/reschedule
 *
 * Body is read from req.body (set by adaptHandler from Fastify's parsed JSON)
 * so that fastify.inject() works correctly in tests.
 */
export async function rescheduleAppointment(
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

    if (!auth || auth.professionalId !== appointment.professional_id) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
      return;
    }

    // Use body pre-parsed by adaptHandler (Fastify JSON parser); fall back to
    // stream reading when called outside the Fastify adapter (e.g. raw HTTP).
    const parsed: unknown = req.body !== undefined
      ? req.body
      : await readBodyJson(req);

    try {
      const validated = await RescheduleRequestSchema.parseAsync(parsed);
      const { new_scheduled_at } = validated;

      const { data, error } = await supabase.rpc('reschedule_appointment_v1', {
        p_old_appointment_id: appointmentId,
        p_new_scheduled_at: new_scheduled_at,
      });

      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
      } else if (data && data.error) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: data.error }));
      } else {
        const safeAppointment = toProfessionalAppointment(data)!;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(safeAppointment));
      }
    } catch (err: any) {
      if (err instanceof ZodError) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Dados de entrada inválidos.',
          details: err.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
      }
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}

function readBodyJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new SyntaxError('JSON inválido.')); }
    });
    req.on('error', reject);
  });
}