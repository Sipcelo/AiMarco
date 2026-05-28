import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import type { AuthContext } from '../../../middleware/auth.js';

export async function deleteService(
  req: IncomingMessage & { auth?: AuthContext },
  res: ServerResponse,
  params: Record<string, string>
) {
  const professionalId = params.id;
  const serviceId = params.serviceId;
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

      // Soft delete / deactivation with ownership constraint
      const { data, error } = await supabase
        .from('services')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', serviceId)
        .eq('professional_id', professionalId)  // CRITICAL: ownership
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Serviço não encontrado.' }));
          return;
        }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao desativar serviço.' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Serviço desativado com sucesso.', data }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    } finally {
      resolve();
    }
  });
}