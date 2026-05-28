import { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase.js';
import { ZodError } from 'zod';

import type { AuthContext } from '../../../middleware/auth.js';

/**
 * Batch rule schema for POST /availability
 */
const BatchAvailabilityRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  is_active: z.boolean().optional().default(true),
}).refine(
  (data) => data.start_time < data.end_time,
  {
    message: "start_time deve ser anterior a end_time.",
    path: ["end_time"],
  }
);

/**
 * POST /v1/professionals/:id/availability
 *
 * Batch create/update availability rules.
 * Body already parsed by Fastify via adapter (req.body = request.body).
 * Accepts an array of rule objects to support complex schedules.
 *
 * On conflict (exclusion constraint violation), returns 409.
 */
export async function createAvailabilityRules(
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

    if (!parsed) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }

    // Support both single object and array
    const rulesArray = Array.isArray(parsed) ? parsed : [parsed];

    if (rulesArray.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Pelo menos uma regra deve ser fornecida.' }));
      return;
    }

    // Validate each rule
    const validatedRules: any[] = [];
    for (const rule of rulesArray) {
      const validated = await BatchAvailabilityRuleSchema.parseAsync(rule);
      validatedRules.push(validated);
    }

    // Check for internal overlaps among the new batch (same day)
    const byDay = new Map<number, typeof validatedRules>();
    validatedRules.forEach(rule => {
      const day = rule.day_of_week;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(rule);
    });

    for (const [, dayRules] of byDay.entries()) {
      dayRules.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
      for (let i = 0; i < dayRules.length - 1; i++) {
        const current = dayRules[i];
        const next = dayRules[i + 1];
        if (current.end_time > next.start_time) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Regras do mesmo dia não podem se sobrepor. Conflito entre ${current.start_time}-${current.end_time} e ${next.start_time}-${next.end_time}.`,
          }));
          return;
        }
      }
    }

    // Insert all rules with professional_id
    const rulesToInsert = validatedRules.map(rule => ({
      ...rule,
      professional_id: professionalId,
    }));

    const { data, error } = await supabase
      .from('availability_rules')
      .insert(rulesToInsert)
      .select();

    if (error) {
      if (error.code === '23P01') { // exclusion_violation
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Uma ou mais regras sobrepõem horários existentes.' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao salvar regras de disponibilidade.' }));
      }
      return;
    }

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Dados de entrada inválidos.',
        details: err.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      }));
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
  }
}
