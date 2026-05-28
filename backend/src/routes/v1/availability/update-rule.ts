import { IncomingMessage, ServerResponse } from 'node:http';
import { z, ZodError } from 'zod';
import { supabase } from '../../../lib/supabase.js';
import type { AuthContext } from '../../../middleware/auth.js';

const UpdateRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  is_active: z.boolean().optional(),
}).refine(
  (data) => data.start_time < data.end_time,
  { message: 'start_time deve ser anterior a end_time.', path: ['end_time'] }
);

/**
 * PUT /v1/professionals/:id/availability-rules/:rid
 *
 * Atualiza uma regra de disponibilidade existente.
 * Valida overlap com outras regras ativas do mesmo professional no mesmo day_of_week.
 */
export async function updateSingleAvailabilityRule(
  req: IncomingMessage & { auth?: AuthContext; body?: any },
  res: ServerResponse,
  params: Record<string, string>
) {
  const professionalId = params.id;
  const ruleId = params.rid;
  const auth = req.auth;

  if (!auth || auth.professionalId !== professionalId) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Você não tem permissão para acessar este recurso.' }));
    return;
  }

  if (!ruleId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ID da regra é obrigatório.' }));
    return;
  }

  try {
    const parsed = req.body;
    if (!parsed || typeof parsed !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }

    const validated = await UpdateRuleSchema.parseAsync(parsed);
    const { day_of_week, start_time, end_time, is_active } = validated;

    const { data: existing, error: fetchError } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('professional_id', professionalId)
      .single();

    if (fetchError || !existing) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Regra não encontrada ou não pertence a este profissional.' }));
      return;
    }

    if (is_active) {
      const { data: conflicts, error: overlapError } = await supabase
        .from('availability_rules')
        .select('id, day_of_week, start_time, end_time')
        .eq('professional_id', professionalId)
        .eq('day_of_week', day_of_week)
        .eq('is_active', true)
        .neq('id', ruleId);

      if (overlapError) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao verificar sobreposições.' }));
        return;
      }

      const hasOverlap = conflicts.some((rule: any) =>
        start_time < rule.end_time && end_time > rule.start_time
      );

      if (hasOverlap) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Este horário sobrepõe uma regra existente para este dia.' }));
        return;
      }
    }

    const updatePayload: Record<string, unknown> = { day_of_week, start_time, end_time };
    if (typeof is_active === 'boolean') updatePayload.is_active = is_active;

    const { data: updated, error: updateError } = await supabase
      .from('availability_rules')
      .update(updatePayload)
      .eq('id', ruleId)
      .eq('professional_id', professionalId)
      .select()
      .single();

    if (updateError) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao atualizar regra de disponibilidade.' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(updated));
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Dados de entrada inválidos.',
        details: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      }));
      return;
    }
    if (err instanceof SyntaxError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}
