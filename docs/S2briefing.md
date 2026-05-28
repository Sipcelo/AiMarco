# AiMarco — Briefing Operacional para Agentes
## Documento de Alinhamento | Engenheiro Senior → Agentes de IA
### Data: 25/03/2026

---

## LEIAM ISTO PRIMEIRO

Este documento é uma ordem operacional. Não é sugestão, não é brainstorm.

Antes de escrever UMA LINHA de código, vocês devem:
1. Ler TODOS os docs em `/docs/` (architecture.md, roadmap.md, progress.md, learn.md, modelagem_inicial_banco.md, api_v1.md)
2. Ler o CLAUDE.md (ou GEMINI.md) do projeto
3. Ler o `planejamento_aimarco.md` — é o mapa de execução
4. Entender a tarefa específica que foi atribuída a vocês

**Se algo não está neste documento ou no planejamento, vocês NÃO implementam. Perguntem.**

---

## REGRAS DE OURO — INVIOLÁVEIS

```
1. NUNCA inventem features que não estão no escopo V1
2. NUNCA mudem a assinatura de uma RPC existente sem autorização
3. NUNCA removam constraints do banco (GiST exclusion, UNIQUE, CHECK)
4. NUNCA façam migrations destrutivas (DROP COLUMN, DROP TABLE)
5. NUNCA hardcodem IDs, URLs ou secrets no código
6. NUNCA committem .env, tokens ou chaves
7. SEMPRE validem input com Zod antes de tocar no banco
8. SEMPRE retornem erros em pt-BR no formato { "error": "mensagem" }
9. SEMPRE usem timestamps ISO 8601 com timezone America/Sao_Paulo
10. SEMPRE testem o que implementaram antes de declarar "pronto"
```

---

## CONTEXTO TÉCNICO QUE VOCÊS PRECISAM SABER

### Stack atual (não mudem)
- **Backend:** Node.js + TypeScript + ESM + Fastify
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (para profissionais)
- **Mobile:** React Native + Expo SDK 55
- **Deploy:** Railway (backend), Supabase (DB)
- **Monorepo:** `apps/mobile`, `backend`, `docs`
- **Shell:** PowerShell (Windows) — Docker para isolamento

### Banco de dados — o que já existe
As 7 tabelas estão criadas e em produção:
- `professionals` (com slug, status, todas as config fields)
- `clients` (scoped por professional, unique on (professional_id, phone))
- `services` (com duration_minutes, buffer_before/after, price_cents)
- `availability_rules` (com is_active, day_of_week 0-6)
- `blocked_slots` (com block_type, GiST exclusion constraint)
- `appointments` (com snapshots, rescheduled_from_appointment_id, GiST exclusion)
- `notifications` (com channel, template_key, scheduled_for)

### RPCs existentes (NÃO QUEBREM)
- `create_appointment_v1` — advisory lock + overlap check + insert atômico
- `cancel_appointment_v1` — transition de status com validação
- `create_public_appointment_v1` — upsert de client + booking transacional

### Endpoints existentes
Públicos (sem auth):
- `GET /health`
- `GET /v1/availability/:professional_id`
- `GET /v1/professionals/:id/available-days`
- `POST /v1/appointments` (guest booking)
- `POST /v1/public/appointments`
- `GET /v1/public/professional/:slug`

Protegidos (precisam de auth — hoje estão ABERTOS, essa é a dívida):
- `GET /v1/professionals/:id/appointments`
- `GET /v1/professionals/:id/blocked-slots`
- `POST /v1/appointments/:id/cancel`
- `POST /v1/appointments/:id/reschedule`
- `POST /v1/appointments/:id/status`
- `POST /v1/professionals/:id/blocked-slots`

---

## TAREFA A1 — AUTH SETUP (OPUS 4.6)

### O que fazer
Implementar autenticação real via Supabase Auth para o lado profissional.

### Passo a passo EXATO

**Step 1: Migration — adicionar `auth_user_id` à tabela `professionals`**
```sql
ALTER TABLE professionals
ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);

CREATE INDEX idx_professionals_auth_user_id ON professionals(auth_user_id);
```

**Por que `auth_user_id` e não usar `id` direto:**
A tabela `professionals` já tem um `id` UUID próprio que é referenciado por TODAS as outras tabelas (services, appointments, blocked_slots, etc). Trocar o id agora quebraria tudo. O `auth_user_id` é a ponte entre o Supabase Auth e o nosso domínio.

**Step 2: Middleware de autenticação Fastify**

Criar arquivo: `backend/src/middleware/auth.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';

export interface AuthContext {
  userId: string;        // auth.users.id
  professionalId: string; // professionals.id
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthContext> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Token de autenticação não fornecido.' });
    throw new Error('Unauthorized');
  }

  const token = authHeader.slice(7);

  // Validar JWT com Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    reply.code(401).send({ error: 'Token inválido ou expirado.' });
    throw new Error('Unauthorized');
  }

  // Buscar professional vinculado
  const { data: professional, error: profError } = await supabase
    .from('professionals')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (profError || !professional) {
    reply.code(403).send({ error: 'Profissional não encontrado para este usuário.' });
    throw new Error('Forbidden');
  }

  return {
    userId: user.id,
    professionalId: professional.id,
  };
}
```

### CUIDADOS CRÍTICOS

**1. `supabase.auth.getUser(token)` vs `supabase.auth.getSession(token)`**
- USEM `getUser()`. Ele valida o JWT no servidor do Supabase.
- `getSession()` pode usar cache local e NÃO é seguro para server-side.
- Se `getUser` retornar erro, o token é inválido. Ponto final.

**2. Não confiem no JWT decodificado no client-side**
- O frontend pode mandar qualquer coisa no header.
- SEMPRE validem server-side com `getUser()`.
- NUNCA decodifiquem o JWT manualmente para extrair claims e confiarem nisso.

**3. O `supabase` client no backend precisa ser o SERVICE_ROLE client**
- O client com `anon` key NÃO consegue validar JWTs de outros usuários.
- O backend DEVE usar `SUPABASE_SERVICE_ROLE_KEY` (não o anon key).
- Verifiquem qual key está configurada em `backend/src/lib/supabase.ts`.
- Se hoje está usando `anon`, TROQUEM para `service_role`.

**4. RLS (Row Level Security) — ATENÇÃO MÁXIMA**
- Com `service_role`, o client BYPASSA RLS por padrão.
- Isso é INTENCIONAL para o backend — nós fazemos nosso próprio ownership check.
- NÃO habilitem RLS nas tabelas se o backend usa service_role, a menos que
  tenham policies muito bem testadas.
- A proteção é feita no middleware `requireAuth` + ownership check nos controllers.

### SE DER ERRO: Planos alternativos

**Problema: `getUser()` retorna erro mesmo com token válido**
- Causa provável: backend usando `anon` key em vez de `service_role`
- Fix: trocar para `service_role` key nas env vars
- Se persistir: verificar se o projeto Supabase tem Auth habilitado

**Problema: `auth.users` não é acessível na migration**
- Causa: schema `auth` é gerenciado pelo Supabase, não diretamente acessível via SQL editor normal
- Fix: rodar a migration via Supabase Dashboard > SQL Editor (não via cliente externo)
- Alternativa: se não conseguirem FK para `auth.users`, removam a FK e mantenham apenas o campo UUID com unique constraint. A integridade será garantida pelo middleware.

```sql
-- PLANO B: sem FK para auth.users
ALTER TABLE professionals
ADD COLUMN auth_user_id UUID UNIQUE;
-- Sem REFERENCES auth.users(id) — middleware garante a integridade
```

**Problema: Professional não tem `auth_user_id` preenchido (registros existentes)**
- Os profissionais demo atuais não têm `auth_user_id`.
- Após criar o primeiro user no Supabase Auth, vinculem manualmente:
```sql
UPDATE professionals SET auth_user_id = '<auth_user_uuid>' WHERE slug = 'demo-professional';
```
- Isso é temporário — o onboarding (B4) vai automatizar esse vínculo.

---

## TAREFA A2 — OWNERSHIP CHECK (CLAUDE CODE)

### O que fazer
Adicionar proteção de propriedade em todos os endpoints de profissional.

### Padrão a seguir em CADA controller

```typescript
// ANTES (vulnerável — qualquer um acessa qualquer profissional)
fastify.get('/v1/professionals/:id/appointments', async (request, reply) => {
  const { id } = request.params as { id: string };
  // ... busca appointments do id
});

// DEPOIS (protegido)
fastify.get('/v1/professionals/:id/appointments', async (request, reply) => {
  const auth = await requireAuth(request, reply);
  const { id } = request.params as { id: string };

  if (id !== auth.professionalId) {
    return reply.code(403).send({
      error: 'Você não tem permissão para acessar este recurso.'
    });
  }

  // ... busca appointments do id
});
```

### Lista COMPLETA de endpoints para proteger

| Endpoint | Ownership check |
|----------|----------------|
| `GET /v1/professionals/:id/appointments` | `:id === auth.professionalId` |
| `GET /v1/professionals/:id/blocked-slots` | `:id === auth.professionalId` |
| `GET /v1/professionals/:id/available-days` | Manter público OU proteger — decisão: **MANTER PÚBLICO** (clientes precisam ver) |
| `POST /v1/professionals/:id/blocked-slots` | `:id === auth.professionalId` |
| `POST /v1/appointments/:id/cancel` | buscar appointment, verificar `professional_id === auth.professionalId` |
| `POST /v1/appointments/:id/status` | buscar appointment, verificar `professional_id === auth.professionalId` |
| `POST /v1/appointments/:id/reschedule` | buscar appointment, verificar `professional_id === auth.professionalId` |

### CUIDADO com cancel e status
Nesses endpoints o `:id` é o ID do APPOINTMENT, não do professional. Vocês precisam:
1. Buscar o appointment pelo id
2. Verificar se o `professional_id` do appointment === `auth.professionalId`
3. Só então executar a ação

```typescript
// Para endpoints onde :id é appointment_id
const { data: appointment } = await supabase
  .from('appointments')
  .select('professional_id')
  .eq('id', appointmentId)
  .single();

if (!appointment || appointment.professional_id !== auth.professionalId) {
  return reply.code(403).send({
    error: 'Você não tem permissão para modificar este agendamento.'
  });
}
```

### NÃO façam
- Não criem um middleware genérico que tenta adivinhar o tipo de `:id` — sejam explícitos em cada controller.
- Não confiem no frontend para mandar o `professional_id` correto — SEMPRE extraiam do JWT.
- Não façam duas queries separadas (uma pro auth, outra pro dado) — se possível, combinem.

---

## TAREFA A3 — RATE LIMITING (GEMINI)

### O que fazer
Instalar e configurar `@fastify/rate-limit` nos endpoints públicos.

### Implementação exata

```bash
cd backend
npm install @fastify/rate-limit
```

```typescript
// Em server.ts ou plugin de setup
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  global: false, // NÃO apliquem global — só nos endpoints específicos
});

// No endpoint de booking público
fastify.post('/v1/appointments', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip,
    }
  }
}, handler);

// No endpoint de booking público v2
fastify.post('/v1/public/appointments', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip,
    }
  }
}, handler);
```

### Response 429 customizado
```typescript
// Na config do plugin
errorResponseBuilder: (request, context) => ({
  error: 'Muitas requisições. Aguarde um momento antes de tentar novamente.'
}),
```

### NÃO façam
- Não apliquem rate limit global — endpoints autenticados não precisam disso agora.
- Não usem `keyGenerator` baseado em headers (X-Forwarded-For) sem ter certeza que Railway preserva o IP real. Testem com `request.ip` primeiro.
- Não bloqueiem o health check.

---

## TAREFA A4 — DTO LAYER (CLAUDE CODE)

### O que fazer
Criar funções de transformação para NUNCA expor campos sensíveis na API.

### Criar arquivo: `backend/src/dtos/index.ts`

### Campos que NUNCA devem sair na API

| Tabela | Campos proibidos |
|--------|-----------------|
| `professionals` | `auth_user_id`, `email` (quando for query pública), `created_at`, `updated_at` internos |
| `clients` | `notes` (em responses públicos), `created_at`, `updated_at` |
| `appointments` | `cancellation_reason` (em responses públicos), campos internos de audit |

### Padrão dos transformers

```typescript
// Exemplo: nunca expor auth_user_id
export function toPublicProfessional(raw: any) {
  return {
    id: raw.id,
    display_name: raw.display_name,
    slug: raw.slug,
    business_type: raw.business_type,
    avatar_url: raw.avatar_url,
    slot_interval_minutes: raw.slot_interval_minutes,
  };
}

export function toAppointmentResponse(raw: any) {
  return {
    id: raw.id,
    professional_id: raw.professional_id,
    service_id: raw.service_id,
    client_id: raw.client_id,
    scheduled_start: raw.scheduled_start,
    scheduled_end: raw.scheduled_end,
    status: raw.status,
    service_name_snapshot: raw.service_name_snapshot,
    client_name_snapshot: raw.client_name_snapshot,
    // NUNCA: client_phone_snapshot em responses públicos
    // NUNCA: cancellation_reason para clientes
  };
}
```

### Regra: SEMPRE passe pelo DTO antes de `reply.send()`
```typescript
// ANTES (perigoso)
reply.send(appointment);

// DEPOIS (seguro)
reply.send(toAppointmentResponse(appointment));
```

---

## TAREFA B1 — RESCHEDULING ENDPOINT (CLAUDE CODE)

### O que fazer
Implementar `POST /v1/appointments/:id/reschedule`

### Lógica EXATA (não inventem)

1. `requireAuth(request, reply)` → obter `professionalId`
2. Buscar appointment pelo `:id`
3. Verificar ownership: `appointment.professional_id === professionalId`
4. Verificar status: appointment deve estar `confirmed`
5. Validar `new_scheduled_at` com Zod (ISO 8601, futuro)
6. Verificar minimum_reschedule_notice (2h default) — `scheduled_start - now >= 120min`
7. Executar em transaction:
   a. Cancelar appointment original (usar `cancel_appointment_v1` existente)
   b. Criar novo appointment com `rescheduled_from_appointment_id = original.id`
8. Retornar `{ id: novo.id, old_appointment_id: original.id, status: 'confirmed', scheduled_at: novo.scheduled_start }`

### CUIDADO: a RPC `create_appointment_v1` faz overlap check
- Reutilizem a RPC existente para criar o novo appointment.
- A RPC já tem advisory lock e GiST validation.
- NÃO reimplementem a lógica de overlap check no controller.

### CUIDADO: snapshot do novo appointment
- O novo appointment deve ter os MESMOS snapshots do original (mesmo serviço, mesmo cliente).
- Copiem `service_name_snapshot`, `service_duration_snapshot_minutes`, `price_snapshot_cents`, `client_name_snapshot`, `client_phone_snapshot` do appointment original.

### SE DER ERRO: cancel succeeded mas create falhou
- Isso é o pior cenário: o original foi cancelado e o novo não foi criado.
- Solução: fazer tudo dentro de uma ÚNICA RPC PostgreSQL.
- Se não quiserem criar nova RPC, usem transaction no Supabase:

```typescript
// Pseudocódigo — precisa validar se supabase-js suporta transactions
// Se não suportar: CRIEM uma RPC reschedule_appointment_v1
```

**Recomendação forte: criem `reschedule_appointment_v1` como RPC no banco.**
Isso garante atomicidade real. O controller só chama a RPC.

---

## TAREFA B3 — PHONE VALIDATION (GEMINI)

### O que fazer
Criar validação e máscara para telefone brasileiro.

### Regras EXATAS

```
Formato aceito: +55DDNNNNNNNNN
- DD = DDD (2 dígitos, 11-99)
- Celular: 9 dígitos (começa com 9)
- Fixo: 8 dígitos (começa com 2-5)

Máscara visual: (11) 99999-9999  ou  (11) 3333-4444

DDDs válidos (lista simplificada V1):
11-19 (SP), 21-28 (RJ/ES), 31-38 (MG), 41-46 (PR),
47-49 (SC), 51-55 (RS), 61 (DF), 62-64 (GO/TO),
65-66 (MT/MS), 67 (MS), 68-69 (AC/RO), 71-77 (BA/SE),
79 (SE), 81-87 (PE/AL/PB), 88-89 (CE/PI),
91-99 (Norte + MA)
```

### Entregáveis

1. `backend/src/validators/phone.ts` — Zod schema + helper
2. `apps/mobile/src/components/PhoneInput.tsx` — componente com máscara
3. Atualizar Zod schemas nos endpoints de booking para usar o novo validator

### NÃO façam
- Não validem operadora (Vivo, Claro, etc) — fora do escopo
- Não façam lookup de telefone em API externa
- Não bloqueiem fixo — aceitem ambos (celular e fixo)
- Não removam o +55 do armazenamento — guardem sempre com código do país

---

## TAREFA B4 — ONBOARDING (OPUS 4.6)

### Contexto
Esta é a tarefa mais complexa. Está dividida em 3 partes.

### B4a — CRUD Endpoints (CLAUDE CODE prepara, Opus revisa)

Endpoints novos que PRECISAM existir antes do wizard:

```
POST   /v1/auth/signup          → criar conta Supabase Auth + professional
POST   /v1/auth/login           → retornar JWT
POST   /v1/professionals/:id/services           → criar serviço
PUT    /v1/professionals/:id/services/:sid       → editar serviço
DELETE /v1/professionals/:id/services/:sid       → desativar (is_active=false, NÃO deletar)
POST   /v1/professionals/:id/availability-rules  → criar regra
PUT    /v1/professionals/:id/availability-rules/:rid → editar regra
DELETE /v1/professionals/:id/availability-rules/:rid → desativar (is_active=false)
PUT    /v1/professionals/:id                     → atualizar perfil
```

**REGRA ABSOLUTA:** DELETE de services e availability_rules NUNCA faz `DELETE FROM`. Apenas seta `is_active = false`. Registros históricos são sagrados neste sistema.

### B4b — Wizard Screens (Opus 4.6)

Sequência de telas:

```
1. [SignupScreen]
   - Email + senha
   - Chamar POST /v1/auth/signup
   - Receber JWT, guardar no SecureStore (expo-secure-store)

2. [ProfileSetupScreen]
   - full_name, display_name, phone, business_type (picker: barbershop/nails/hair)
   - Chamar PUT /v1/professionals/:id
   - Gerar slug automaticamente (display_name → kebab-case)

3. [ServicesSetupScreen]
   - Lista editável de serviços
   - Para cada: nome, duração (picker: 15/30/45/60/90/120min), preço opcional
   - Chamar POST /v1/professionals/:id/services para cada

4. [AvailabilitySetupScreen]
   - Grade visual semanal (dom-sáb)
   - Para cada dia: toggle on/off + horário início/fim
   - Permitir múltiplos ranges no mesmo dia (ex: 09-12 + 14-18)
   - Chamar POST /v1/professionals/:id/availability-rules para cada

5. [OnboardingCompleteScreen]
   - Mostrar link público: aimarco.com.br/p/{slug}
   - Botão "Compartilhar link"
   - Botão "Ir para minha agenda"
```

### CUIDADOS no wizard

**1. Persistência progressiva:**
- Cada step deve salvar no backend ANTES de avançar.
- Se o app crashar no step 3, os steps 1 e 2 já estão salvos.
- No re-open, verificar o estado do professional e pular steps completos.

**2. Não bloqueiem o botão "Avançar" com loading infinito:**
- Se a API falhar, mostrem toast com erro e PERMITAM retry.
- Não naveguem para o próximo step se o save falhou.

**3. SecureStore para o JWT:**
```typescript
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('jwt', token);
const token = await SecureStore.getItemAsync('jwt');
```
- NÃO usem AsyncStorage para tokens. AsyncStorage não é criptografado.

**4. Grade de disponibilidade:**
- Este é o componente mais difícil do wizard.
- NÃO tentem fazer drag-and-drop no V1. Façam com pickers simples.
- Para cada dia: Switch (ativo/inativo) + TimePicker início + TimePicker fim.
- Botão "+ Adicionar horário" para múltiplos ranges no mesmo dia.

---

## TAREFA C1-C4 — TESTES (CLAUDE CODE + GEMINI)

### Framework: Vitest

```bash
cd backend
npm install -D vitest @vitest/coverage-v8
```

### Estrutura de testes
```
backend/
  tests/
    domain/
      availability.test.ts    ← C1 (CLAUDE CODE)
      overlap.test.ts          ← C2 (CLAUDE CODE)
      cancel-reschedule.test.ts ← C3 (GEMINI)
    integration/
      api.test.ts              ← C4 (CLAUDE CODE)
    helpers/
      seed.ts                  ← dados de teste reutilizáveis
      setup.ts                 ← configuração de test database
```

### REGRA para testes: cada teste deve ser independente
- Cada test case faz seu próprio seed e cleanup.
- NUNCA dependam da ordem de execução.
- NUNCA dependam de dados de outros testes.

### Cenários OBRIGATÓRIOS (não pulem nenhum)

**C1 — Availability:**
```
✓ Profissional com regra 09-18, serviço 30min → slots de 09:00 a 17:30
✓ Blocked slot 12-13 → remove slots 12:00 e 12:30
✓ Appointment confirmado 10:00-10:30 → remove slot 10:00
✓ Buffer before 15min → slot antes do appointment também removido
✓ Booking notice 30min → slots no passado imediato removidos
✓ Dia sem availability_rule → zero slots
✓ availability_rule com is_active=false → ignorada
✓ Múltiplas regras no mesmo dia (09-12, 14-18) → slots corretos
```

**C2 — Overlap:**
```
✓ Dois appointments no mesmo horário → segundo falha com 409
✓ Appointment + blocked slot no mesmo horário → booking falha
✓ Advisory lock → 10 requests simultâneos → apenas 1 sucede
✓ Appointment cancelled no horário → novo booking PODE ser criado
```

**C3 — Cancel/Reschedule:**
```
✓ Cancel confirmed → status=cancelled, cancelled_at preenchido
✓ Cancel already cancelled → 409
✓ Cancel completed → 409
✓ Reschedule → old cancelled, new confirmed, linkage correto
✓ Reschedule para slot ocupado → 409, original NÃO é cancelado
✓ Cancel dentro de 2h do horário → erro de notice
```

---

## TAREFA D1 — REMOVE HARDCODED IDS (GEMINI)

### O que remover

Procurem nos arquivos do mobile por:
```
DEMO_PROFESSIONAL_ID
DEMO_SERVICE_ID
```

### Substituir por

```typescript
// DEMO_PROFESSIONAL_ID → vem do auth context
import { useAuth } from '../contexts/AuthContext';
const { professionalId } = useAuth();

// DEMO_SERVICE_ID → vem da seleção do usuário na tela
// No booking flow: o cliente seleciona o serviço
// Na agenda: o profissional já tem seus serviços carregados
```

### CUIDADO: isso depende de A1 (auth) e B4 (onboarding)
- Se auth ainda não estiver pronto, NÃO removam os hardcoded IDs.
- Criem um TODO comment e sigam em frente.
- Remover sem ter auth implementado QUEBRA o app inteiro.

---

## TAREFA E3 — SECURITY AUDIT (OPUS 4.6)

### Checklist COMPLETO — verificar cada item

```
AUTH & ACCESS
[ ] Todo endpoint de profissional exige JWT válido
[ ] Todo endpoint verifica ownership (professional_id === auth user)
[ ] Endpoints públicos NÃO exigem auth (booking, availability, public profile)
[ ] Token expirado retorna 401 (não 500)
[ ] Token de outro profissional retorna 403 (não dados do outro)

INPUT VALIDATION
[ ] TODOS os request bodies passam por Zod schema
[ ] UUIDs são validados como UUID (não strings genéricas)
[ ] Datas são validadas como ISO 8601
[ ] Telefones são validados com regra BR
[ ] Nenhum campo aceita valores absurdos (duration_minutes: -1, price: -500)

DATA EXPOSURE
[ ] auth_user_id NUNCA aparece em responses
[ ] client_phone_snapshot NUNCA aparece em responses públicos
[ ] Erro 500 NUNCA expõe stack trace ou detalhes internos
[ ] Responses de erro são sempre { "error": "mensagem em pt-BR" }

DATABASE SAFETY
[ ] GiST exclusion constraints estão ativas (appointments, blocked_slots)
[ ] Advisory lock funciona (testar com requests concorrentes)
[ ] Migrations não têm DROP TABLE/COLUMN sem backup plan
[ ] service_role key está APENAS no backend (nunca no mobile)

INFRASTRUCTURE
[ ] CORS configurado (só permitir domínios conhecidos)
[ ] Helmet ou headers de segurança no Fastify
[ ] Rate limiting nos endpoints públicos
[ ] HTTPS em produção (Railway já faz, confirmar)
[ ] Variáveis de ambiente: nenhuma hardcoded, todas via .env

WHATSAPP WORKER
[ ] Worker continua funcionando após mudanças de auth
[ ] Failure_reason sendo logado no banco
[ ] Webhook de WA tem signature validation (se aplicável)
```

---

## PADRÕES DE COMUNICAÇÃO ENTRE VOCÊS

### Quando um agente terminar uma tarefa

Deve atualizar `progress.md` com:
```markdown
### [Tarefa] (Done — YYYY-MM-DD)
- O que foi implementado (1-3 linhas)
- Arquivos criados/modificados
- Testes passando: sim/não
```

### Quando encontrar um problema que não sabe resolver

Deve adicionar em `learn.md`:
```markdown
### [Data] — Problema: [descrição]
- Contexto: o que estava tentando fazer
- Erro: mensagem ou comportamento inesperado
- Status: bloqueado / resolvido com [solução]
```

### Quando precisar criar uma migration

Nome OBRIGATÓRIO: `YYYYMMDD_HHMMSS_descricao.sql`
Exemplo: `20260325_143000_add_auth_user_id_to_professionals.sql`

Local: `backend/migrations/` (criar pasta se não existir)

TODA migration deve ter rollback documentado em comentário:
```sql
-- Migration: add auth_user_id to professionals
ALTER TABLE professionals ADD COLUMN auth_user_id UUID UNIQUE;

-- Rollback (use only if needed):
-- ALTER TABLE professionals DROP COLUMN auth_user_id;
```

---

## O QUE FAZER QUANDO ALGO DER ERRADO

### Árvore de decisão

```
Erro no banco (migration falhou)?
├── Verificar se a migration foi rodada no Supabase SQL Editor
├── Verificar se a tabela/coluna já existe (migration duplicada)
└── Se corrompeu: NÃO tentem fix manual → reportem ao humano

Erro de auth (401/403 inesperado)?
├── Verificar se está usando service_role key (não anon)
├── Verificar se getUser() está sendo chamado (não getSession)
├── Verificar se auth_user_id está preenchido no professional
└── Logar o erro COMPLETO no console antes de reportar

Erro de overlap (409 quando deveria funcionar)?
├── Verificar timezone: o horário no DB está em UTC?
├── Verificar se o slot está realmente livre (query manual)
├── Verificar se há blocked_slot cobrindo o horário
└── NUNCA desabilitem a GiST constraint para "resolver" o 409

Erro no mobile (tela branca, crash)?
├── Verificar console do Expo (expo start --clear)
├── Verificar se a URL do backend está correta nas env vars
├── Verificar se o endpoint retorna o formato esperado
└── NUNCA façam try/catch que silencia o erro — sempre logem

RPC falhou (supabase.rpc retornou erro)?
├── Verificar se os parâmetros estão no formato correto (UUID, timestamp)
├── Verificar se a RPC existe no Supabase (pode ter sido dropeada)
├── Rodar a RPC manualmente no SQL Editor com os mesmos params
└── Se a RPC precisa de mudança: NUNCA alterem direto — criem v2
```

---

## LEMBRETE FINAL

Vocês são executores. O humano é o arquiteto.

Se a tarefa não está clara: **parem e perguntem**.
Se descobrirem um problema não previsto: **documentem e perguntem**.
Se tiverem uma "ideia melhor": **documentem e perguntem**.
Se algo do planejamento parecer errado: **documentem e perguntem**.

**Nunca tomem decisões arquiteturais sozinhos.**
**Nunca adicionem features não planejadas.**
**Nunca "melhorem" algo que está funcionando sem autorização.**

O objetivo é um V1 sólido, não um V1 bonito.
Disciplina > velocidade. Sempre.
