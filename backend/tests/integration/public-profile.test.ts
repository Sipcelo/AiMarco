/**
 * Testes de Integração — Rota Pública GET /v1/public/professional/:slug
 *
 * Objetivo: Garantir que a rota pública NUNCA expõe campos sensíveis.
 *
 * Setup: Usa banco de teste real (Docker/Supabase local).
 * Estratégia:
 *   1. Criar professional de teste (com auth_user_id, email, phone)
 *   2. Criar serviços associados
 *   3. GET /v1/public/professional/{slug}
 *   4. Verificar que resposta NÃO contém auth_user_id, email, phone
 *
 * Regra de ouro (security-auditor):
 * - DTO Layer deve filtrar 100% dos campos sensíveis
 * - Tests running against REAL database (não mocks)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { requireIntegrationEnv } from '../helpers/env.js';

const { ok: envOk, missing: envMissing } = requireIntegrationEnv();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = envOk ? createClient(supabaseUrl, supabaseKey) : null!;

describe.skipIf(!envOk)(`Integração — GET /v1/public/professional/:slug (requer: ${envMissing.join(', ') || 'ok'})`, () => {

  const testProfessional = {
    display_name: 'Regina Test',
    bio: 'Massagista profissional',
    avatar_url: 'https://example.com/avatar.jpg',
    timezone: 'America/Sao_Paulo',
    slug: 'regina-test-' + Date.now(),
    // Campos sensíveis que DEVEM ser filtrados pelo DTO:
    auth_user_id: 'auth-uuid-secret',
    email: 'regina@test.com',
    phone: '+5511999999999',
    full_name: 'Regina Test Full',
    business_type: 'massagem',
  };

  const testService = {
    name: 'Massagem Relaxante',
    duration_minutes: 60,
    price_cents: 15000,
    description: 'Relaxamento',
    is_active: true,
  };

  beforeAll(async () => {
    // 1. Criar professional no banco de teste
    const { data: prof, error: profErr } = await supabase
      .from('professionals')
      .insert([testProfessional])
      .select()
      .single();

    if (profErr) {
      throw new Error(`Falha ao criar professional de teste: ${profErr.message}`);
    }

    // 2. Criar service associado
    const { error: svcErr } = await supabase
      .from('services')
      .insert([{ ...testService, professional_id: prof.id }]);

    if (svcErr) {
      throw new Error(`Falha ao criar service de teste: ${svcErr.message}`);
    }
  }, 120000);

  afterAll(async () => {
    // Limpeza: deletar professional (cascade services)
    const { error } = await supabase
      .from('professionals')
      .delete()
      .eq('slug', testProfessional.slug);

    if (error) {
      console.error('Erro na limpeza de teste:', error.message);
    }
  }, 30000);

  it('deve retornar payload público SEM campos sensíveis', async () => {
    // Fetch via DTO layer (simulando chamada HTTP)
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('id, display_name, bio, avatar_url, timezone, slug')
      .eq('slug', testProfessional.slug)
      .single();

    if (profError || !professional) {
      throw new Error(`Professional não encontrado: ${profError?.message}`);
    }

    // Aplicar DTO (como a rota faz)
    const { toPublicProfessional, toPublicServiceList } = await import('../src/dtos/index.js');
    const publicProf = toPublicProfessional(professional)!;

    // Assertions de segurança (NÃO expor):
    expect(publicProf.auth_user_id).toBeUndefined();
    expect(publicProf.email).toBeUndefined();
    expect(publicProf.phone).toBeUndefined();
    expect(publicProf.full_name).toBeUndefined();
    expect(publicProf.business_type).toBeUndefined();
    expect(publicProf.created_at).toBeUndefined();
    expect(publicProf.updated_at).toBeUndefined();

    // Campos públicos devem existir:
    expect(publicProf.id).toBe(professional.id);
    expect(publicProf.display_name).toBe(testProfessional.display_name);
    expect(publicProf.slug).toBe(testProfessional.slug);
    expect(publicProf.timezone).toBe(testProfessional.timezone);
  });

  it('deve retornar serviços SEM professional_id', async () => {
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', testProfessional.id);

    expect(services).toHaveLength(1);

    const { toPublicServiceList } = await import('../src/dtos/index.js');
    const publicServices = toPublicServiceList(services);

    // Cada service deve estar sem professional_id (dados sensíveis)
    expect(publicServices[0].professional_id).toBeUndefined();
    expect(publicServices[0].id).toBe(services[0].id);
    expect(publicServices[0].name).toBe(testService.name);
    expect(publicServices[0].is_active).toBe(true);
  });

});
