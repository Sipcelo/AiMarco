import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { ServiceCreateSchema } from '../../../shared/index.js';
import { ZodError } from 'zod';
import { toPublicService } from '../../../dtos/index.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function createService(
  req: IncomingMessage & { auth?: AuthContext; body?: any },
  res: ServerResponse,
  params: Record<string, string>
) {
  const professionalId = params.id;
  const auth = req.auth;

  try {
    // Ownership check
    if (!auth || auth.professionalId !== professionalId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
      return;
    }

    // Body já parseado pelo Fastify via adaptador
    const parsed = req.body;

    if (!parsed || typeof parsed !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }

    const validated = await ServiceCreateSchema.parseAsync(parsed);

    const { data, error } = await supabase
      .from('services')
      .insert([{
        ...validated,
        professional_id: professionalId,
      }])
      .select()
      .single();

    if (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao criar serviço.' }));
      return;
    }

    const safeService = toPublicService(data)!;
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(safeService));
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
