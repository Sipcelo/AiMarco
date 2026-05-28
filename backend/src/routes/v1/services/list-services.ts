import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { toPublicServiceList } from '../../../dtos/index.js';

export async function listServices(req: IncomingMessage, res: ServerResponse, params: Record<string, string>) {
  const professionalId = params.id;
  const auth = (req as any).auth;

  // Ownership check
  if (!auth || auth.professionalId !== professionalId) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
    return;
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', professionalId)
      .order('name', { ascending: true });

    if (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao listar serviços.' }));
    } else {
      const safeServices = toPublicServiceList(data || []);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(safeServices));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}
