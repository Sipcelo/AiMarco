import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function listAvailabilityRules(
  req: IncomingMessage & { auth?: AuthContext },
  res: ServerResponse,
  params: Record<string, string>
) {
  const professionalId = params.id;
  const auth = req.auth;

  return new Promise<void>(async (resolve) => {
    try {
      // Ownership check
      if (!auth || auth.professionalId !== professionalId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
        resolve();
        return;
      }

      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('professional_id', professionalId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao listar regras de disponibilidade.' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    } finally {
      resolve();
    }
  });
}