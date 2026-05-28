import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { toPublicProfessional, toPublicServiceList } from '../../../dtos/index.js';

/**
 * GET /v1/public/professional/:slug
 *
 * Retorna perfil público e serviços ativos de um profissional.
 * Usa DTOs para nunca expor objetos crus do banco.
 */
export async function getPublicProfile(req: IncomingMessage, res: ServerResponse, params: Record<string, string>) {
  const slug = params.id;

  return new Promise<void>(async (resolve) => {
    try {
      // 1. Fetch professional by slug (campos mínimos necessários para DTO)
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id, display_name, bio, avatar_url, timezone, slug, business_type')
        .eq('slug', slug)
        .single();

      if (profError || !professional) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Profissional não encontrado.' }));
        resolve();
        return;
      }

      // 2. Fetch active services
      const { data: services, error: servError } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price_cents, description, is_active')
        .eq('professional_id', professional.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (servError) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao buscar serviços.' }));
        resolve();
        return;
      }

      // 3. Aplicar DTOs (nunca retornar objetos crus)
      const publicProf = toPublicProfessional(professional)!;
      const publicServices = toPublicServiceList(services || []);

      // 4. Responder com estrutura limpa
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ...publicProf,
        services: publicServices,
      }));
    } catch (err) {
      console.error('Erro em getPublicProfile:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    } finally {
      resolve();
    }
  });
}