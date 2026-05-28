import { IncomingMessage, ServerResponse } from 'node:http';
import { listBlockedSlots } from '../../../lib/list-blocked-slots.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function listBlockedSlotsHandler(
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
    const slots = await listBlockedSlots(professional_id, date);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(slots));
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}