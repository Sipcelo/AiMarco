import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import type { AuthContext } from '../../../middleware/auth.js';

/**
 * DELETE /v1/professionals/:id/availability-rules/:rid
 *
 * Exclusão lógica de uma regra de disponibilidade.
 * NUNCA executa DELETE FROM. Apenas seta is_active = false.
 *
 * Retorna 200 com { "message": "Regra desativada com sucesso." }
 */
export async function deleteAvailabilityRule(
  req: IncomingMessage & { auth?: AuthContext },
  res: ServerResponse,
  params: Record<string, string>
) {
  const professionalId = params.id;
  const ruleId = params.rid;
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

      // Validate ruleId
      if (!ruleId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ID da regra é obrigatório.' }));
        resolve();
        return;
      }

      // Verify rule exists and belongs to this professional
      const { data: existing, error: fetchError } = await supabase
        .from('availability_rules')
        .select('id, is_active')
        .eq('id', ruleId)
        .eq('professional_id', professionalId)
        .single();

      if (fetchError || !existing) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Regra não encontrada ou não pertence a este profissional.' }));
        return;
      }

      // If already inactive, return success (idempotent)
      if (!existing.is_active) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Regra já estava desativada.' }));
        return;
      }

      // Logical delete: set is_active = false
      const { error: updateError } = await supabase
        .from('availability_rules')
        .update({ is_active: false })
        .eq('id', ruleId)
        .eq('professional_id', professionalId);

      if (updateError) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao desativar regra de disponibilidade.' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Regra desativada com sucesso.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    } finally {
      resolve();
    }
  });
}
