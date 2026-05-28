import { IncomingMessage, ServerResponse } from 'node:http';
import { createBlockedSlot } from '../../../lib/create-blocked-slot.js';
import { BlockedSlotCreateSchema } from '../../../shared/index.js';
import { ZodError } from 'zod';
import type { AuthContext } from '../../../middleware/auth.js';

export async function createBlockedSlotHandler(
  req: IncomingMessage & { auth?: AuthContext; body?: any },
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

  try {
    // Body já parseado pelo Fastify via adaptador
    const parsed = req.body;

    if (!parsed || typeof parsed !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }

    const validated = await BlockedSlotCreateSchema.parseAsync(parsed);
    const { starts_at, ends_at, reason } = validated;

    const slot = await createBlockedSlot(professional_id, starts_at, ends_at, reason);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(slot));
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Dados de entrada inválidos.',
        details: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      }));
      return;
    }

    const businessErrors = [
      'Formato de data inválido.',
      'O horário de início deve ser anterior ao horário de fim.',
      'Este período conflita com um bloqueio já existente.',
      'Horário indisponível (DB Constraint)',
    ];
    if (businessErrors.includes(err.message)) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}
