import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { toOwnProfessional } from '../../../dtos/index.js';

export async function getProfile(req: IncomingMessage, res: ServerResponse, params: Record<string, string>) {
  const professionalId = params.id;
  const auth = (req as any).auth;

  // Ownership check (authPlugin já validou token e existence, mas verificamos profissionalId)
  if (!auth || auth.professionalId !== professionalId) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
    return;
  }

  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', professionalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Profissional não encontrado.' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao buscar perfil.' }));
      }
    } else {
      const safeProfile = toOwnProfessional(data)!;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(safeProfile));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}
