import { IncomingMessage, ServerResponse } from 'node:http';
import { getAvailability } from '../../../lib/get-availability.js';

export async function getAvailabilityHandler(req: IncomingMessage, res: ServerResponse, params: Record<string, string>) {
  const professional_id = params.id;
  const [_, query] = (req.url || '').split('?');
  const urlParams = new URLSearchParams(query);
  const service_id = urlParams.get('service_id');
  const date = urlParams.get('date');

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!professional_id || !service_id || !date || !dateRegex.test(date)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Dados de entrada inválidos.' }));
    return;
  }

  try {
    const slots = await getAvailability(professional_id, service_id, date, 30);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ date, slots }));
  } catch (err: any) {
    if (err.message === 'Service not found or does not belong to the professional.') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}
