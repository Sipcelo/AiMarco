# AiMarco — Briefing Operacional para Agentes (v2)
## Documento de Alinhamento | Engenheiro Senior → Agentes de IA
### Data: 27/03/2026 | Atualizado com base na auditoria de progresso

---

## LEIAM ISTO PRIMEIRO

Este documento é uma ordem operacional. Não é sugestão, não é brainstorm.

Antes de escrever UMA LINHA de código, vocês devem:
1. Ler TODOS os docs em `/docs/` (architecture.md, roadmap.md, progress.md, learn.md, modelagem_inicial_banco.md, api_v1.md)
2. Ler o CLAUDE.md (ou GEMINI.md) do projeto
3. Ler este briefing por COMPLETO
4. Entender a tarefa específica que foi atribuída a vocês

**Se algo não está neste documento, vocês NÃO implementam. Perguntem.**

---

## O QUE JÁ FOI FEITO (não toquem)

As tarefas abaixo foram auditadas e confirmadas como concluídas. NÃO reimplementem, NÃO refatorem, NÃO "melhorem" nenhuma delas sem autorização explícita do arquiteto.

| Código | Tarefa | Status |
|--------|--------|--------|
| ~~A1~~ | Auth Setup (auth_user_id, middleware JWT, requireAuth, SERVICE_ROLE_KEY) | ✅ Concluído |
| ~~A3~~ | Rate Limiting (@fastify/rate-limit em endpoints públicos, 429 pt-BR) | ✅ Concluído |
| ~~B1~~ | Rescheduling Endpoint (POST /v1/appointments/:id/reschedule + RPC + testes) | ✅ Concluído |
| ~~C4~~ | API Integration Tests (15+ arquivos cobrindo auth, availability, concorrência, perfil, segurança) | ✅ Concluído |

**Trabalho extra encontrado (fora do briefing original — NÃO MEXAM SEM AUTORIZAÇÃO):**
- MFA/AAL2 endpoints (POST /v1/private/mfa/enroll e /verify)
- Private Cockpit (/v1/private/blocked-slots e /v1/private/appointments/today)
- verifyProfessionalAAL2 em auth.ts
- rate-limiter.ts in-memory além do @fastify/rate-limit
- BetterRouter em backend/src/lib/router.ts

⚠️ O MFA/AAL2 NÃO estava no escopo V1. Não expandam. Não refatorem. Deixem como está até o arquiteto decidir.

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
- **Auth:** Supabase Auth (para profissionais) — JÁ IMPLEMENTADO
- **Mobile:** React Native + Expo SDK 55
- **Deploy:** Railway (backend), Supabase (DB)
- **Monorepo:** `apps/mobile`, `backend`, `docs`
- **Shell:** PowerShell (Windows) — Docker para isolamento

### Banco de dados — o que já existe
As 7 tabelas estão criadas e em produção:
- `professionals` (com slug, status, auth_user_id, todas as config fields)
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
- `reschedule_appointment_v1` — cancel + create atômico com linkage

### Auth — o que JÁ existe (não reimplementem)
- `backend/src/middleware/auth.ts` — authPlugin com getUser(token) server-side
- `backend/src/lib/auth.ts` — verifyProfessional() e verifyPrivate() com lookup via auth_user_id
- `backend/src/types/fastify-auth.ts` — FastifyRequest.auth? com type augmentation
- `backend/src/lib/fastify-adapter.ts` — copia req.auth para raw request
- SUPABASE_SERVICE_ROLE_KEY configurada

### Endpoints existentes
Públicos (sem auth):
- `GET /health`
- `GET /v1/availability/:professional_id`
- `GET /v1/professionals/:id/available-days`
- `POST /v1/appointments` (guest booking) ← com rate limiting ✅
- `POST /v1/public/appointments` ← com rate limiting ✅
- `GET /v1/public/professional/:slug`

Protegidos (com ownership check no código, MAS middleware não está wired):
- `GET /v1/professionals/:id/appointments`
- `GET /v1/professionals/:id/blocked-slots`
- `POST /v1/appointments/:id/cancel`
- `POST /v1/appointments/:id/reschedule`
- `POST /v1/appointments/:id/status`
- `POST /v1/professionals/:id/blocked-slots`

Auth/Onboarding (já implementados):
- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET/POST /v1/professionals/:id/services`
- `PATCH/DELETE /v1/professionals/:id/services/:serviceId`
- `GET/PATCH /v1/professionals/:id/profile`
- `GET/POST /v1/professionals/:id/availability`

---

## TAREFA A2 — WIRING DO AUTH MIDDLEWARE (CRÍTICA — BLOQUEANTE)

### Complexidade: 🟡 Claude Code
### Prioridade: #1 ABSOLUTA — sem isso, auth não funciona

### Situação atual
O código de ownership check EXISTE e está correto em cada handler. MAS o `authPlugin` definido em `backend/src/middleware/auth.ts` **NÃO está registrado em `server.ts`**. Sem `fastify.register(authPlugin)`, o `request.auth` permanece `undefined` em TODAS as rotas. Os handlers verificam `!auth` e retornam 403 para TODO MUNDO, incluindo usuários legítimos.

### O que fazer (EXATAMENTE)

1. Abrir `backend/src/server.ts`
2. Localizar onde os plugins são registrados (após o rate-limit, antes das rotas)
3. Adicionar:

```typescript
import { authPlugin } from './middleware/auth.js';

// Registrar ANTES das rotas protegidas, DEPOIS do rate-limit
await fastify.register(authPlugin);
```

4. Verificar que o authPlugin faz um `onRequest` hook ou `preHandler` nas rotas certas
5. Se o authPlugin aplica auth em TODAS as rotas: ajustar para NÃO afetar endpoints públicos

### CUIDADO: endpoints públicos NÃO devem exigir auth
Endpoints que DEVEM continuar funcionando SEM token:
- `GET /health`
- `GET /v1/availability/:professional_id`
- `GET /v1/professionals/:id/available-days`
- `POST /v1/appointments`
- `POST /v1/public/appointments`
- `GET /v1/public/professional/:slug`

Se o authPlugin é um hook global, ele precisa de uma lista de exclusão, ou precisa ser registrado apenas como scoped plugin nas rotas protegidas.

### Teste obrigatório após implementar

```bash
# 1. Endpoint público SEM token → deve retornar 200
curl https://aimarco.up.railway.app/health
# Esperado: { "status": "ok" }

# 2. Endpoint protegido SEM token → deve retornar 401
curl https://aimarco.up.railway.app/v1/professionals/<id>/appointments?date=2026-03-27
# Esperado: { "error": "Token de autenticação não fornecido." }

# 3. Endpoint protegido COM token válido → deve retornar 200
curl -H "Authorization: Bearer <JWT>" https://aimarco.up.railway.app/v1/professionals/<id>/appointments?date=2026-03-27
# Esperado: array de appointments

# 4. Endpoint protegido COM token de OUTRO profissional → deve retornar 403
# Esperado: { "error": "Você não tem permissão..." }
```

### SE DER ERRO

**Problema: authPlugin quebra todos os endpoints ao registrar**
- Causa provável: o plugin usa um hook `onRequest` global
- Fix: trocar para `preHandler` scoped por prefixo:
```typescript
// Em vez de hook global:
fastify.register(async function protectedRoutes(instance) {
  instance.addHook('preHandler', authMiddleware);
  // registrar rotas protegidas AQUI DENTRO
}, { prefix: '/v1/professionals' });
```

**Problema: request.auth é undefined mesmo após registrar o plugin**
- Verificar se o authPlugin faz `request.auth = { ... }` ou `request.raw.auth = { ... }`
- Verificar se o type augmentation em `fastify-auth.ts` corresponde ao que o plugin seta
- Verificar a ordem: plugin deve ser registrado ANTES das rotas

**Problema: endpoints públicos começam a retornar 401**
- O plugin está interceptando rotas que não deveria
- Fix: adicionar skip list no plugin ou usar scoped registration

---

## TAREFA A4 — DTO LAYER (CLAUDE CODE)

### Complexidade: 🟡 Claude Code
### Prioridade: #2

### O que fazer
Criar funções de transformação para NUNCA expor campos sensíveis na API.

### Criar arquivo: `backend/src/dtos/index.ts`

### Campos que NUNCA devem sair na API

| Tabela | Campos proibidos |
|--------|-----------------|
| `professionals` | `auth_user_id`, `email` (em queries públicas), `created_at`, `updated_at` internos |
| `clients` | `notes` (em responses públicos), `created_at`, `updated_at` |
| `appointments` | `cancellation_reason` (em responses públicos), campos internos de audit |

### Padrão dos transformers

```typescript
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
// ANTES (perigoso — expõe auth_user_id)
reply.send(appointment);

// DEPOIS (seguro)
reply.send(toAppointmentResponse(appointment));
```

### Verificar endpoint por endpoint
Após criar os DTOs, percorrer CADA handler que faz `reply.send()` ou `res.end(JSON.stringify(...))` e aplicar o transformer correto. A auditoria encontrou `list-appointments.ts` enviando objeto bruto do banco e `signup.ts` fazendo select manual sem transformer.

---

## TAREFA B3 — VALIDAÇÃO DE TELEFONE BR COM MÁSCARA (GEMINI)

### Complexidade: 🟢 Gemini
### Prioridade: #3

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

## TAREFA B4a — COMPLETAR CRUD ENDPOINTS (CLAUDE CODE)

### Complexidade: 🟡 Claude Code
### Prioridade: #4

### Situação atual
A maioria dos endpoints de onboarding JÁ EXISTE:
- ✅ `POST /v1/auth/signup` — cria auth user + professional
- ✅ `POST /v1/auth/login` — retorna JWT
- ✅ `GET/POST /v1/professionals/:id/services` — listar e criar serviços
- ✅ `PATCH/DELETE /v1/professionals/:id/services/:serviceId` — editar e desativar
- ✅ `GET/PATCH /v1/professionals/:id/profile` — ver e atualizar perfil
- ✅ `GET/POST /v1/professionals/:id/availability` — listar e criar regras

### O que FALTA (implementar)

```
PUT  /v1/professionals/:id/availability-rules/:rid  → editar regra individual
DELETE /v1/professionals/:id/availability-rules/:rid → desativar (is_active=false)
```

**REGRA ABSOLUTA:** DELETE NUNCA faz `DELETE FROM`. Apenas seta `is_active = false`. Registros históricos são sagrados neste sistema.

### Padrão de implementação

Seguir exatamente o mesmo padrão dos endpoints de services que já existem:
- `PATCH /v1/professionals/:id/services/:serviceId` → usar como referência para PUT availability-rules
- `DELETE /v1/professionals/:id/services/:serviceId` → usar como referência para DELETE availability-rules
- Ownership check via `requireAuth` + `professionalId === :id`
- Zod validation no body (para PUT: start_time, end_time, day_of_week, is_active)
- Retornar 404 se rule não encontrada, 403 se ownership falhar

---

## TAREFA B4b — WIZARD SCREENS DE ONBOARDING (OPUS 4.6)

### Complexidade: 🔴 Opus 4.6
### Prioridade: #5 (depende de A2 funcional + B4a completo)

### Sequência de telas

```
1. [SignupScreen]
   - Email + senha
   - Chamar POST /v1/auth/signup
   - Receber JWT, guardar no SecureStore (expo-secure-store)

2. [ProfileSetupScreen]
   - full_name, display_name, phone, business_type (picker: barbershop/nails/hair)
   - Chamar PATCH /v1/professionals/:id/profile
   - Gerar slug automaticamente (display_name → kebab-case)

3. [ServicesSetupScreen]
   - Lista editável de serviços
   - Para cada: nome, duração (picker: 15/30/45/60/90/120min), preço opcional
   - Chamar POST /v1/professionals/:id/services para cada

4. [AvailabilitySetupScreen]
   - Grade visual semanal (dom-sáb)
   - Para cada dia: toggle on/off + horário início/fim
   - Permitir múltiplos ranges no mesmo dia (ex: 09-12 + 14-18)
   - Chamar POST /v1/professionals/:id/availability para cada

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

## TAREFA B4c — ONBOARDING STATE MANAGEMENT (OPUS 4.6)

### Complexidade: 🔴 Opus 4.6
### Prioridade: #6 (depende de B4b)

### O que criar

1. **AuthContext** (`apps/mobile/src/contexts/AuthContext.tsx`)
   - Guardar JWT no SecureStore
   - Expor `{ isAuthenticated, professionalId, token, login(), logout() }`
   - Verificar token válido no app start (chamar getUser)
   - Se token expirado: redirecionar para login

2. **Integração de state entre wizard screens**
   - O professionalId vem do signup response
   - Cada screen seguinte usa esse id para as chamadas PUT/POST
   - Se o user fecha e reabre no meio do wizard: verificar quais dados já existem e pular

3. **Navegação condicional no App.tsx**
   - Se não autenticado → SignupScreen
   - Se autenticado mas sem serviços → continuar wizard do ponto correto
   - Se autenticado e completo → ScheduleScreen (agenda)

---

## TAREFA B2 — TELA DE RESCHEDULING NO MOBILE (CLAUDE CODE)

### Complexidade: 🟡 Claude Code
### Prioridade: #7 (depende de B4b/B4c para navegação funcional)

### O que fazer
Na tela de agenda do profissional (ScheduleScreen), adicionar ação de "Reagendar" em cada appointment.

### Flow

1. Na lista de appointments do dia, cada card tem botão "Reagendar"
2. Ao clicar: abrir modal ou navegar para tela de seleção de novo horário
3. Reutilizar componentes do booking flow (date picker + slot picker)
4. Ao confirmar: chamar `POST /v1/appointments/:id/reschedule` com `{ new_scheduled_at }`
5. Feedback: toast de sucesso ou erro (409 = "Horário indisponível")
6. Atualizar a lista de appointments

### CUIDADO
- O endpoint `POST /v1/appointments/:id/reschedule` JÁ EXISTE e funciona.
- NÃO reimplementem a lógica. Apenas façam a UI que chama o endpoint.
- O endpoint exige JWT — usar token do AuthContext.

---

## TAREFA C1 — COMPLETAR TESTES DE AVAILABILITY (CLAUDE CODE)

### Complexidade: 🟡 Claude Code
### Prioridade: #8

### Situação atual
Arquivo `backend/tests/domain/smart-slots.test.ts` JÁ EXISTE com testes de:
- ✅ Slots sem bookings
- ✅ Overlap com appointment
- ✅ Blocked slots remove vizinhos
- ✅ Service duration vs interval

### Cenários que FALTAM (adicionar ao arquivo existente)

```
❌ availability_rule com is_active=false → deve ser ignorada (zero slots)
❌ Booking notice 30min → slots no passado imediato devem ser removidos
❌ Múltiplas regras no mesmo dia (09-12 + 14-18) → slots corretos em ambos os ranges
❌ Dia sem nenhuma availability_rule → zero slots retornados
❌ Buffer before 15min no serviço → slot adjacente anterior ao appointment removido
```

### NÃO façam
- Não criem um novo arquivo de teste. Adicionem ao `smart-slots.test.ts` existente.
- Não mudem os testes que já passam.

---

## TAREFA C2 — COMPLETAR TESTES DE OVERLAP (CLAUDE CODE)

### Complexidade: 🟡 Claude Code
### Prioridade: #9

### Situação atual
Arquivos existentes:
- `backend/tests/concurrency/race-condition.test.ts`
- `backend/tests/integration/concurrency.test.ts`

### Cenários que FALTAM (verificar e adicionar se ausente)

```
❌ Appointment cancelado no horário → novo booking no mesmo slot DEVE funcionar
❌ Appointment + blocked slot no mesmo horário → booking DEVE falhar com 409
```

Estes devem ser testes isolados com assertions claras, não apenas stress tests.

---

## TAREFA C3 — COMPLETAR TESTES DE CANCEL/RESCHEDULE (GEMINI)

### Complexidade: 🟢 Gemini
### Prioridade: #10

### Situação atual
Arquivos existentes:
- `backend/tests/integration/reschedule.test.ts` (cobre 200 OK e 409)
- Testes de cancel confirmados via git log

### Cenários que FALTAM (verificar e adicionar se ausente)

```
❌ Cancel de appointment já cancelled → deve retornar 409
❌ Cancel de appointment completed → deve retornar 409
❌ Cancel dentro de 2h do scheduled_start → deve retornar erro de notice
❌ Reschedule para slot ocupado → 409, E o original NÃO é cancelado (atomicidade)
```

Cada cenário deve ter assertion explícita verificando status code E estado do banco após a operação.

---

## TAREFA D1 — REMOVER HARDCODED IDS DO FRONTEND (GEMINI)

### Complexidade: 🟢 Gemini
### Prioridade: #11 (depende de B4c — AuthContext pronto)

### O que remover

Procurem nos arquivos do mobile por:
```
DEMO_PROFESSIONAL_ID
DEMO_SERVICE_ID
```

Encontrados em:
- `apps/mobile/src/screens/ScheduleScreen.tsx`
- `apps/mobile/src/screens/BookingScreen.tsx`

### Substituir por

```typescript
// DEMO_PROFESSIONAL_ID → vem do AuthContext
import { useAuth } from '../contexts/AuthContext';
const { professionalId } = useAuth();

// DEMO_SERVICE_ID → vem da seleção do usuário na tela
// No booking flow: o cliente seleciona o serviço
// Na agenda: o profissional já tem seus serviços carregados
```

### ⚠️ BLOQUEANTE: não façam isso antes do AuthContext (B4c) existir
Se B4c não estiver pronto, NÃO removam os hardcoded IDs. Adicionem um TODO comment e sigam.

---

## TAREFA D2 — SEPARAR AMBIENTES SUPABASE (CLAUDE CODE)

### Complexidade: 🟡 Claude Code
### Prioridade: #12

### O que fazer
1. Criar projeto Supabase separado para desenvolvimento
2. Script de migração para replicar schema no projeto dev
3. Variáveis de ambiente por environment:
   - `.env.development` → aponta para Supabase dev
   - `.env.production` → aponta para Supabase prod
4. Railway: verificar como injetar env vars por environment
5. Documentar em learn.md como trocar entre ambientes

---

## TAREFA D3 — FIX REACT NATIVE VERSION (GEMINI)

### Complexidade: 🟢 Gemini
### Prioridade: #13

### O que fazer
```bash
cd apps/mobile
npm install react-native@0.83.2
```
Verificar se há breaking changes. Rodar `expo start --clear` e testar navegação básica.

---

## TAREFA E1 — ATUALIZAR api_v1.md (GEMINI)

### Complexidade: 🟢 Gemini
### Prioridade: #14

### Situação atual
O api_v1.md ainda diz na seção "Not implemented in V1":
- "Professional registration/onboarding endpoints — pending"
- "Service management endpoints — pending"
- "Availability rules management endpoints — pending"

MAS esses endpoints JÁ EXISTEM (signup, login, services CRUD, profile, availability).

### O que fazer
1. Remover da seção "Not implemented" os itens que foram implementados
2. Adicionar documentação no formato padrão para:
   - `POST /v1/auth/signup`
   - `POST /v1/auth/login`
   - `GET/POST /v1/professionals/:id/services`
   - `PATCH/DELETE /v1/professionals/:id/services/:serviceId`
   - `GET/PATCH /v1/professionals/:id/profile`
   - `GET/POST /v1/professionals/:id/availability`
   - `PUT/DELETE /v1/professionals/:id/availability-rules/:rid` (quando B4a estiver pronto)
3. Seguir EXATAMENTE o formato dos endpoints já documentados (Query params, Response, Notes)

---

## TAREFA E2 — ATUALIZAR progress.md (GEMINI)

### Complexidade: 🟢 Gemini
### Prioridade: #15

### O que registrar como Done (com data)

```markdown
### A1 — Auth Setup (Done — 2026-03-25) ← JÁ ESTÁ no progress.md
### A3 — Rate Limiting (Done — 2026-03-25)
- @fastify/rate-limit nos endpoints públicos de booking
- 429 com mensagem pt-BR, health check não afetado

### B1 — Reschedule Endpoint (Done — 2026-03-25)
- POST /v1/appointments/:id/reschedule com RPC atômica
- Ownership check, Zod validation, testes de integração

### C4 — Integration Tests (Done — 2026-03-25)
- 15+ arquivos de teste cobrindo auth, availability, concorrência, perfil, segurança
```

---

## TAREFA E3 — SECURITY CHECKLIST FINAL (OPUS 4.6)

### Complexidade: 🔴 Opus 4.6
### Prioridade: #16 — ÚLTIMA tarefa (depende de A2 + A4 concluídos)

### Checklist COMPLETO — verificar cada item

```
AUTH & ACCESS
[ ] authPlugin REGISTRADO em server.ts (A2 resolvido)
[ ] Todo endpoint de profissional exige JWT válido
[ ] Todo endpoint verifica ownership (professional_id === auth user)
[ ] Endpoints públicos NÃO exigem auth (booking, availability, public profile)
[ ] Token expirado retorna 401 (não 500)
[ ] Token de outro profissional retorna 403 (não dados do outro)
[✓] Rate limiting nos endpoints públicos (A3 feito)

INPUT VALIDATION
[ ] TODOS os request bodies passam por Zod schema
[ ] UUIDs são validados como UUID (não strings genéricas)
[ ] Datas são validadas como ISO 8601
[ ] Telefones são validados com regra BR (B3 feito)
[ ] Nenhum campo aceita valores absurdos (duration_minutes: -1, price: -500)

DATA EXPOSURE
[ ] DTOs aplicados em todos os endpoints (A4 feito)
[ ] auth_user_id NUNCA aparece em responses
[ ] client_phone_snapshot NUNCA aparece em responses públicos
[ ] Erro 500 NUNCA expõe stack trace ou detalhes internos
[ ] Responses de erro são sempre { "error": "mensagem em pt-BR" }

DATABASE SAFETY
[✓] GiST exclusion constraints ativas (appointments, blocked_slots)
[✓] Advisory lock funciona (testado em C4)
[ ] Migrations não têm DROP TABLE/COLUMN sem backup plan
[✓] service_role key está APENAS no backend (nunca no mobile)

INFRASTRUCTURE
[ ] CORS configurado (só permitir domínios conhecidos)
[ ] Helmet ou headers de segurança no Fastify
[✓] Rate limiting nos endpoints públicos (A3 feito)
[ ] HTTPS em produção (Railway já faz, confirmar)
[ ] Variáveis de ambiente: nenhuma hardcoded, todas via .env

WHATSAPP WORKER
[ ] Worker continua funcionando após mudanças de auth
[✓] failure_reason sendo logado no banco
[ ] Webhook de WA tem signature validation (se aplicável)
```

---

## ORDEM DE EXECUÇÃO FINAL

```
#1  A2  — Wiring do authPlugin em server.ts     🟡 Claude Code    ← BLOQUEANTE
#2  A4  — DTO Layer                               🟡 Claude Code
#3  B3  — Phone Validation BR                     🟢 Gemini         ← paralelo com #2
#4  B4a — Completar availability-rules CRUD        🟡 Claude Code
#5  B4b — Wizard Screens de Onboarding            🔴 Opus 4.6
#6  B4c — AuthContext + State Management           🔴 Opus 4.6
#7  B2  — Tela de Rescheduling Mobile              🟡 Claude Code
#8  C1  — Completar testes Availability            🟡 Claude Code    ← paralelo
#9  C2  — Completar testes Overlap                 🟡 Claude Code    ← paralelo
#10 C3  — Completar testes Cancel/Reschedule       🟢 Gemini         ← paralelo
#11 D1  — Remover Hardcoded IDs                    🟢 Gemini         ← após B4c
#12 D2  — Separar Ambientes Supabase               🟡 Claude Code    ← independente
#13 D3  — Fix RN version                           🟢 Gemini         ← independente
#14 E1  — Atualizar api_v1.md                      🟢 Gemini
#15 E2  — Atualizar progress.md                    🟢 Gemini
#16 E3  — Security Audit Final                     🔴 Opus 4.6      ← ÚLTIMO
```

---

## MAPA DE DEPENDÊNCIAS ATUALIZADO

```
A2 (wiring) ─────┬──→ A4 (DTOs)
                 │
                 ├──→ B4a (CRUD restante) ──→ B4b (Wizard) ──→ B4c (State) ──→ D1 (IDs)
                 │                                                    │
                 └──→ C1, C2, C3 (testes)                            └──→ B2 (Reschedule UI)

B3 (Phone)        ← independente, pode rodar em paralelo
D2 (Env Split)    ← independente
D3 (RN Fix)       ← independente
E1, E2 (Docs)     ← rodar após implementações
E3 (Security)     ← ÚLTIMO — depende de TUDO acima
```

---

## PADRÕES DE COMUNICAÇÃO

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
Local: `backend/migrations/`

TODA migration deve ter rollback documentado em comentário.

---

## O QUE FAZER QUANDO ALGO DER ERRADO

### Árvore de decisão

```
Erro de auth (401/403 inesperado)?
├── PRIMEIRO: verificar se authPlugin está registrado em server.ts (A2)
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