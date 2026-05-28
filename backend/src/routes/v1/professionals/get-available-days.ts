import { IncomingMessage, ServerResponse } from 'node:http';
import { getAvailableDays } from '../../../lib/get-available-days.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function getAvailableDaysHandler(
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
  const countParam = urlParams.get('count');
  const count = countParam ? parseInt(countParam, 10) : 14;

  if (!professional_id) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing professional_id' }));
    return;
  }

  try {
    const days = await getAvailableDays(professional_id, count);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ days }));
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}