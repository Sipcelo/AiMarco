import { IncomingMessage, ServerResponse } from 'node:http';
import { createAppointment } from '../../../lib/create-appointment.js';
import { notifyProfessionalNewAppointment } from '../../../lib/send-push-notification.js';
import { AppointmentCreateSchema } from '../../../shared/index.js';
import { ZodError } from 'zod';
import { toProfessionalAppointment } from '../../../dtos/index.js';

export async function createAppointmentHandler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  try {
    const parsed = req.body;
    const validated = await AppointmentCreateSchema.parseAsync(parsed);
    const { professional_id, service_id, scheduled_at, client_name, client_phone } = validated;

    try {
      const appointment = await createAppointment({
        professionalId: professional_id,
        serviceId: service_id,
        scheduledAt: scheduled_at,
        clientName: client_name,
        clientPhone: client_phone,
      });

      const safeAppointment = toProfessionalAppointment(appointment)!;
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(safeAppointment));

      notifyProfessionalNewAppointment(
        safeAppointment.professional_id,
        safeAppointment.client_name ?? 'Cliente',
        safeAppointment.service_name ?? 'Serviço',
        safeAppointment.scheduled_at,
      ).catch(() => {});
    } catch (err: any) {
      if (err.message === 'Service not found or does not belong to the professional.') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      if (
        err.message === 'Selected slot is no longer available.' ||
        err.message === 'Horário indisponível (DB Constraint)'
      ) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    }
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Dados de entrada inválidos.',
        details: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      }));
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}