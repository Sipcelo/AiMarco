import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function updatePushTokenHandler(
  req: IncomingMessage & { auth?: AuthContext; body?: any },
  res: ServerResponse,
  params: Record<string, string>,
) {
  const professionalId = params.id;
  const auth = req.auth;

  if (!auth || auth.professionalId !== professionalId) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Acesso negado.' }));
    return;
  }

  const pushToken = req.body?.push_token;
  if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'push_token inválido.' }));
    return;
  }

  const { error } = await supabase
    .from('professionals')
    .update({ push_token: pushToken })
    .eq('id', professionalId);

  if (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro ao salvar token.' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}
