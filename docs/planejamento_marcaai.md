# AiMarco — Planejamento Completo de Implementação

## Documento: Plano de Trabalho para Agentes de IA
### Data: 25/03/2026 | Fase atual: 9 — Refinement

---

## 1. Diagnóstico do Estado Atual

### O que está pronto (sólido)
- Backend Node.js + TypeScript rodando em Railway
- Banco PostgreSQL com exclusion constraints GiST (overlap prevention real)
- Booking flow completo: guest booking → auto-confirm → advisory lock
- Professional schedule: day view, week view, status actions, cancellation
- Blocked slots com criação, listagem e warning de conflito
- WhatsApp confirmations (worker assíncrono)
- RPC atômicas: `create_appointment_v1`, `cancel_appointment_v1`, `create_public_appointment_v1`
- Public profile via slug

### O que falta (Fase 9 + dívidas técnicas)
- Rescheduling by professional
- Auth real para profissionais (JWT + Supabase Auth)
- Validação de telefone BR com máscara
- Onboarding UI do profissional
- Testes automatizados de domínio
- Security checklist
- Remoção de hardcoded IDs no frontend
- Separação de ambientes (dev/prod no Supabase)

---

## 2. Classificação das Tarefas por Complexidade

### Legenda de Agentes

| Símbolo | Agente | Quando usar |
|---------|--------|-------------|
| 🟢 | **Gemini** | Tarefas mecânicas, repetitivas, bem definidas, sem ambiguidade |
| 🟡 | **Claude Code** | Tarefas que exigem entender contexto, tomar decisões de design, refatorar |
| 🔴 | **Opus 4.6** | Tarefas arquiteturais complexas, decisões com trade-offs, orquestração multi-arquivo |

---

## 3. Backlog Completo — Ordem de Implementação

### BLOCO A — Segurança & Auth (pré-requisito para tudo)

#### A1. Supabase Auth — Setup para Profissionais
- **Complexidade:** 🔴 OPUS 4.6
- **Por quê:** Decisão arquitetural com impacto em cascata. Precisa definir:
  - Fluxo de signup/login (email+senha? magic link?)
  - Como o JWT do Supabase Auth se conecta à tabela `professionals`
  - Trigger ou RPC para criar registro em `professionals` no primeiro login
  - Middleware de extração de JWT em TODAS as rotas protegidas
  - Ownership check pattern: `WHERE professional_id = auth.uid()`
- **Entregáveis:**
  1. Migration: coluna `auth_user_id` (UUID, FK para `auth.users`) em `professionals`
  2. Middleware Fastify para JWT validation
  3. Helper `requireAuth(request)` que retorna `{ professionalId, userId }`
  4. RLS policies no Supabase para cada tabela
  5. Teste: request sem token → 401, token de outro profissional → 403
- **Riscos:** Se mal feito, todo endpoint protegido fica vulnerável. Zero margem para erro.
- **Estimativa:** 4-6h de trabalho focado

#### A2. Ownership Check em Endpoints Existentes
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** Mecânico MAS requer entender cada controller e adicionar o guard correto.
- **Tarefa:** Após A1, passar em TODOS os endpoints de profissional e adicionar:
  ```typescript
  const { professionalId } = requireAuth(request);
  // validar que :id === professionalId
  ```
- **Endpoints afetados:**
  - `GET /v1/professionals/:id/appointments`
  - `GET /v1/professionals/:id/blocked-slots`
  - `GET /v1/professionals/:id/available-days`
  - `POST /v1/professionals/:id/blocked-slots`
  - `POST /v1/appointments/:id/cancel` (professional-side)
  - `POST /v1/appointments/:id/status`
- **Estimativa:** 2-3h

#### A3. Rate Limiting no Endpoint Público de Booking
- **Complexidade:** 🟢 GEMINI
- **Por quê:** Bem definido, sem ambiguidade. Plugin Fastify `@fastify/rate-limit`.
- **Tarefa:**
  - Instalar plugin
  - Configurar: 10 requests/minuto por IP em `POST /v1/appointments`
  - Configurar: 30 requests/minuto por IP em `POST /v1/public/appointments`
  - Response 429 com mensagem em pt-BR
- **Estimativa:** 30min-1h

#### A4. DTO Layer — Nunca Expor Objetos Crus do Banco
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** Precisa mapear cada response para entender quais campos são sensíveis.
- **Tarefa:**
  - Criar `/backend/src/dtos/` com transformers para cada entidade
  - `toPublicAppointment()`, `toPublicProfessional()`, `toPublicService()`
  - Garantir que `auth_user_id`, `email`, dados internos nunca saiam na API
- **Estimativa:** 2-3h

---

### BLOCO B — Funcionalidades Pendentes

#### B1. Rescheduling by Professional
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** A lógica já está definida (cancel + create com linkage), mas precisa:
  - Novo endpoint `POST /v1/appointments/:id/reschedule`
  - Validação: appointment pertence ao profissional autenticado
  - Validação: novo slot disponível (rodar availability check)
  - Atomicidade: cancel + create dentro de transaction/RPC
  - Retornar `old_appointment_id` no response
- **Nota:** O endpoint público de reschedule JÁ EXISTE na API doc. Aqui é a implementação para o lado profissional com auth.
- **Dependência:** A1 (auth) deve estar pronto
- **Estimativa:** 3-4h

#### B2. Tela de Rescheduling no Mobile (Professional)
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** Precisa criar o flow no mobile:
  1. Na tela de appointments, botão "Reagendar"
  2. Abrir seletor de nova data/horário (reutilizar componentes do booking flow)
  3. Confirmar → chamar endpoint → feedback visual
- **Dependência:** B1 (endpoint pronto)
- **Estimativa:** 3-4h

#### B3. Validação de Telefone BR com Máscara
- **Complexidade:** 🟢 GEMINI
- **Por quê:** Regra 100% definida, sem ambiguidade:
  - Formato: +55 + DDD (2 dígitos) + número (9 dígitos celular / 8 dígitos fixo)
  - Máscara visual: (11) 99999-9999
  - Validação: regex + verificação de DDD válido
  - Aplicar no formulário de booking (guest) e futuro onboarding
- **Entregáveis:**
  1. Utility function: `validateBRPhone(phone): { valid, formatted, raw }`
  2. Componente React Native: `PhoneInput` com máscara
  3. Backend validation: Zod schema atualizado
- **Nota:** Conforme progress.md, este item foi adiado para quando houver navegação e contexto real. Pode ser implementado agora como componente isolado.
- **Estimativa:** 2h

#### B4. Professional Onboarding UI
- **Complexidade:** 🔴 OPUS 4.6
- **Por quê:** É o flow mais complexo do frontend. Envolve:
  1. **Tela de Registro/Login** — integrar com Supabase Auth
  2. **Wizard de Onboarding** (multi-step):
     - Step 1: Dados básicos (nome, telefone, tipo de negócio)
     - Step 2: Criar serviços (nome, duração, preço opcional)
     - Step 3: Definir disponibilidade semanal (grade visual)
     - Step 4: Revisar e confirmar
  3. **Persistência progressiva** — salvar cada step, permitir voltar
  4. **Geração do slug** — criar URL pública do profissional
  5. **Tela de "Pronto!"** — mostrar link compartilhável
- **Por que Opus:** São ~5 telas interconectadas com state management complexo, validações em cada step, chamadas a múltiplos endpoints (alguns ainda não existem), e UX decisions.
- **Endpoints que AINDA NÃO EXISTEM (precisam ser criados antes):**
  - `POST /v1/professionals` (criar perfil)
  - `PUT /v1/professionals/:id` (atualizar perfil)
  - `POST /v1/professionals/:id/services` (criar serviço)
  - `PUT /v1/professionals/:id/services/:sid` (editar serviço)
  - `POST /v1/professionals/:id/availability-rules` (criar regra)
  - `PUT /v1/professionals/:id/availability-rules/:rid` (editar regra)
- **Estimativa:** 10-15h (incluindo endpoints novos)
- **Recomendação:** Quebrar em sub-tarefas:
  - B4a: Endpoints de CRUD (Claude Code) — 4h
  - B4b: Wizard screens (Opus) — 6h
  - B4c: State management e integração (Opus) — 4h

---

### BLOCO C — Testes & Qualidade

#### C1. Testes de Domínio — Availability Engine
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** Precisa entender as regras de negócio profundamente:
  - Dada uma `availability_rule` de 09:00-18:00, com serviço de 30min → gerar slots corretos
  - Blocked slot de 12:00-13:00 → remover slots afetados
  - Appointment confirmado às 10:00 (30min) → slot 10:00 indisponível
  - Buffer before/after de serviço → slots adjacentes afetados
  - Minimum booking notice de 30min → slots no passado removidos
- **Framework:** Vitest (já é TypeScript, ESM-friendly)
- **Estimativa:** 4-5h

#### C2. Testes de Domínio — Overlap Prevention
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** Testar as exclusion constraints do PostgreSQL:
  - Dois appointments no mesmo horário → um falha
  - Advisory lock → requests concorrentes não criam duplicata
  - Blocked slot + appointment no mesmo horário → booking falha
- **Nota:** O load simulator de race condition JÁ EXISTE (Phase 3.3). Expandir.
- **Estimativa:** 2-3h

#### C3. Testes de Domínio — Cancellation & Rescheduling
- **Complexidade:** 🟢 GEMINI
- **Por quê:** Cenários bem definidos:
  - Cancel appointment confirmado → status = cancelled, cancelled_at preenchido
  - Cancel appointment já cancelado → 409
  - Reschedule → old cancelled, new confirmed, linkage correto
  - Minimum cancel notice (2h) → cancel dentro de 2h → erro
- **Estimativa:** 2h

#### C4. Testes de API (Integration)
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** Precisa configurar test environment com banco real (ou mocks):
  - Setup: Supabase local ou test database
  - Cada teste: seed → request → assert → cleanup
  - Cobertura: todos os endpoints da api_v1.md
- **Estimativa:** 5-6h

---

### BLOCO D — Dívidas Técnicas

#### D1. Remover Hardcoded IDs no Frontend
- **Complexidade:** 🟢 GEMINI
- **Por quê:** Puro search-and-replace + lógica de contexto:
  - `DEMO_PROFESSIONAL_ID` → vir do auth context ou deep link
  - `DEMO_SERVICE_ID` → vir da seleção na tela
- **Dependência:** A1 (auth) + B4 (onboarding) idealmente
- **Estimativa:** 1-2h

#### D2. Separar Ambientes Supabase (Dev/Prod)
- **Complexidade:** 🟡 CLAUDE CODE
- **Por quê:** Envolve:
  - Criar projeto Supabase separado para dev
  - Script de migração para replicar schema
  - Variáveis de ambiente por environment
  - CI/CD awareness (Railway deploys qual env?)
- **Estimativa:** 3-4h

#### D3. Fix react-native@0.83.0 vs 0.83.2
- **Complexidade:** 🟢 GEMINI
- **Por quê:** `npm install react-native@0.83.2` e resolver breaking changes (se houver).
- **Estimativa:** 30min

---

### BLOCO E — Documentação & Deploy

#### E1. Atualizar api_v1.md com Novos Endpoints
- **Complexidade:** 🟢 GEMINI
- **Por quê:** Seguir o padrão existente do documento e adicionar os novos endpoints.
- **Estimativa:** 1h

#### E2. Atualizar progress.md
- **Complexidade:** 🟢 GEMINI
- **Por quê:** Mecânico: marcar checkboxes, adicionar novas entries.
- **Estimativa:** 30min

#### E3. Security Checklist Final
- **Complexidade:** 🔴 OPUS 4.6
- **Por quê:** Revisão holística de segurança:
  - Audit de todos os endpoints: auth ✓, ownership ✓, rate limit ✓, DTO ✓
  - Verificar se RLS policies cobrem todos os cenários
  - SQL injection vectors (Supabase JS client é safe, mas RPCs custom?)
  - CORS configuration
  - Webhook signature validation (WhatsApp)
  - Mass assignment: verificar que request bodies são validados com Zod whitelist
  - Headers de segurança (Helmet ou equivalente)
- **Estimativa:** 3-4h

---

## 4. Ordem de Execução Recomendada

```
SPRINT 1 — Foundation de Segurança (5-7h)
├── A1. Auth Setup (Opus 4.6)          ← PRIMEIRO, tudo depende disso
├── A3. Rate Limiting (Gemini)          ← paralelo, independente
└── D3. Fix RN version (Gemini)         ← paralelo, independente

SPRINT 2 — Blindagem (4-6h)
├── A2. Ownership Checks (Claude Code)  ← depende de A1
├── A4. DTO Layer (Claude Code)         ← depende de A1
└── B3. Phone Validation (Gemini)       ← independente

SPRINT 3 — Rescheduling (6-8h)
├── B1. Reschedule Endpoint (Claude Code)  ← depende de A2
└── B2. Reschedule UI Mobile (Claude Code) ← depende de B1

SPRINT 4 — Testes (8-10h)
├── C1. Availability Tests (Claude Code)
├── C2. Overlap Tests (Claude Code)
├── C3. Cancel/Reschedule Tests (Gemini)
└── C4. Integration Tests (Claude Code)

SPRINT 5 — Onboarding (10-15h)
├── B4a. CRUD Endpoints (Claude Code)
├── B4b. Wizard Screens (Opus 4.6)
└── B4c. Integration (Opus 4.6)

SPRINT 6 — Fechamento (5-8h)
├── D1. Remove Hardcoded IDs (Gemini)
├── D2. Separate Environments (Claude Code)
├── E1. Update api_v1.md (Gemini)
├── E2. Update progress.md (Gemini)
└── E3. Security Audit (Opus 4.6)
```

---

## 5. Mapa de Dependências

```
A1 (Auth) ─────┬──→ A2 (Ownership) ──→ B1 (Reschedule API) ──→ B2 (Reschedule UI)
               │
               ├──→ A4 (DTOs)
               │
               ├──→ B4a (CRUD Endpoints) ──→ B4b (Wizard) ──→ B4c (Integration)
               │                                                      │
               └──→ D1 (Remove Hardcoded) ←────────────────────────────┘

A3 (Rate Limit)  ← independente
B3 (Phone Valid)  ← independente
C1-C4 (Testes)    ← podem rodar após A2
D2 (Env Split)    ← independente
D3 (RN Fix)       ← independente
E3 (Security)     ← ÚLTIMO (depende de tudo)
```

---

## 6. Resumo de Distribuição por Agente

### 🟢 Gemini (tarefas bem definidas, mecânicas)
| Tarefa | Estimativa |
|--------|-----------|
| A3. Rate Limiting | 1h |
| B3. Phone Validation BR | 2h |
| C3. Cancel/Reschedule Tests | 2h |
| D1. Remove Hardcoded IDs | 1.5h |
| D3. Fix RN version | 0.5h |
| E1. Update api_v1.md | 1h |
| E2. Update progress.md | 0.5h |
| **Total Gemini** | **~8.5h** |

### 🟡 Claude Code (contexto + decisões de design moderadas)
| Tarefa | Estimativa |
|--------|-----------|
| A2. Ownership Checks | 2.5h |
| A4. DTO Layer | 2.5h |
| B1. Reschedule Endpoint | 3.5h |
| B2. Reschedule UI Mobile | 3.5h |
| B4a. CRUD Endpoints | 4h |
| C1. Availability Tests | 4.5h |
| C2. Overlap Tests | 2.5h |
| C4. Integration Tests | 5.5h |
| D2. Separate Environments | 3.5h |
| **Total Claude Code** | **~32h** |

### 🔴 Opus 4.6 (arquitetura, trade-offs, complexidade alta)
| Tarefa | Estimativa |
|--------|-----------|
| A1. Auth Setup | 5h |
| B4b. Onboarding Wizard | 6h |
| B4c. Onboarding Integration | 4h |
| E3. Security Audit | 3.5h |
| **Total Opus** | **~18.5h** |

### Total geral estimado: ~59h de trabalho

---

## 7. Pontos de Atenção Críticos

### ⚠️ Armadilhas que vão aparecer

1. **Auth + RLS no Supabase é traiçoeiro**
   O Supabase Auth funciona bem para o básico, mas quando você tem RPCs custom
   (`create_appointment_v1`), o `auth.uid()` dentro da RPC depende do JWT
   estar sendo passado corretamente pelo client. Testar isso end-to-end é
   obrigatório antes de seguir.

2. **Onboarding é 30% do trabalho restante**
   B4 (Onboarding) sozinho é quase 1/4 do esforço total. É tentador fazer
   "rapidinho" mas é onde mora a complexidade de UX: multi-step form, validação
   progressiva, persistência parcial, e a grade de disponibilidade semanal
   (que é basicamente um mini-scheduler visual).

3. **Testes de availability vão revelar edge cases**
   Quando C1 rodar, provavelmente vai encontrar bugs em cenários como:
   - Serviço de 45min em grade de 15min (slot alignment)
   - Buffer before/after cruzando com blocked slot
   - Horário de verão (timezone shift)
   Reservar tempo extra para C1.

4. **Hardcoded IDs são uma bomba-relógio**
   O frontend hoje funciona porque `DEMO_PROFESSIONAL_ID` aponta para um registro
   real. No momento que auth existir, o frontend precisa pegar o ID do profissional
   logado. Se D1 não for feito junto com A1, o app quebra.

5. **WhatsApp worker precisa de auth awareness**
   O worker de WhatsApp (Phase 5.1) provavelmente roda sem auth context.
   Verificar que ele continua funcionando após as mudanças de auth/RLS.

---

## 8. Critérios de "Pronto" para V1

- [ ] Profissional consegue se registrar, criar serviços e definir horários
- [ ] Cliente consegue agendar como guest
- [ ] Profissional consegue ver agenda, cancelar, reagendar, completar
- [ ] Nenhum endpoint de profissional funciona sem JWT válido
- [ ] Nenhum appointment sobrepõe outro (constraint + test provando)
- [ ] Telefone BR validado no booking
- [ ] Zero IDs hardcoded no frontend
- [ ] Testes de domínio passando (availability, overlap, cancel, reschedule)
- [ ] Security checklist 100%
- [ ] Ambientes dev/prod separados

---

## 🇺🇸 English Version

# AiMarco — Complete Implementation Plan

## Document: Work Plan for AI Agents
### Date: 2026-03-25 | Current phase: 9 — Refinement

---

## 1. Current State Diagnosis

### What's ready (solid)
- Node.js + TypeScript backend running on Railway
- PostgreSQL with GiST exclusion constraints (real overlap prevention)
- Complete booking flow: guest booking → auto-confirm → advisory lock
- Professional schedule: day view, week view, status actions, cancellation
- Blocked slots with creation, listing, and conflict warning
- WhatsApp confirmations (async worker)
- Atomic RPCs: `create_appointment_v1`, `cancel_appointment_v1`, `create_public_appointment_v1`
- Public profile via slug

### What's missing (Phase 9 + technical debt)
- Rescheduling by professional
- Real auth for professionals (JWT + Supabase Auth)
- BR phone validation with mask
- Professional onboarding UI
- Automated domain tests
- Security checklist
- Removal of hardcoded IDs in frontend
- Environment separation (dev/prod on Supabase)

---

## 2. Task Classification by Complexity

### Agent Legend

| Symbol | Agent | When to use |
|---------|--------|-------------|
| 🟢 | **Gemini** | Mechanical, repetitive, well-defined, no ambiguity tasks |
| 🟡 | **Claude Code** | Tasks requiring context understanding, design decisions, refactoring |
| 🔴 | **Opus 4.6** | Complex architectural tasks, trade-off decisions, multi-file orchestration |

---

## 3. Complete Backlog — Implementation Order

### BLOCK A — Security & Auth (prerequisite for everything)

#### A1. Supabase Auth — Setup for Professionals
- **Complexity:** 🔴 OPUS 4.6
- **Why:** Architectural decision with cascading impact. Must define:
  - Signup/login flow (email+password? magic link?)
  - How Supabase Auth JWT connects to `professionals` table
  - Trigger or RPC to create `professionals` record on first login
  - JWT extraction middleware on ALL protected routes
  - Ownership check pattern: `WHERE professional_id = auth.uid()`
- **Deliverables:**
  1. Migration: `auth_user_id` column (UUID, FK to `auth.users`) in `professionals`
  2. Fastify middleware for JWT validation
  3. `requireAuth(request)` helper returning `{ professionalId, userId }`
  4. RLS policies on Supabase for each table
  5. Test: request without token → 401, token from another professional → 403
- **Risks:** If done wrong, all protected endpoints become vulnerable. Zero margin for error.
- **Estimate:** 4-6h focused work

#### A2. Ownership Check on Existing Endpoints
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Mechanical BUT requires understanding each controller and adding correct guard.
- **Task:** After A1, review ALL professional endpoints and add:
  ```typescript
  const { professionalId } = requireAuth(request);
  // validate that :id === professionalId
  ```
- **Endpoints affected:**
  - `GET /v1/professionals/:id/appointments`
  - `GET /v1/professionals/:id/blocked-slots`
  - `GET /v1/professionals/:id/available-days`
  - `POST /v1/professionals/:id/blocked-slots`
  - `POST /v1/appointments/:id/cancel` (professional-side)
  - `POST /v1/appointments/:id/status`
- **Estimate:** 2-3h

#### A3. Rate Limiting on Public Booking Endpoint
- **Complexity:** 🟢 GEMINI
- **Why:** Well-defined, no ambiguity. Fastify plugin `@fastify/rate-limit`.
- **Task:**
  - Install plugin
  - Configure: 10 requests/minute per IP on `POST /v1/appointments`
  - Configure: 30 requests/minute per IP on `POST /v1/public/appointments`
  - Response 429 with pt-BR message
- **Estimate:** 30min-1h

#### A4. DTO Layer — Never Expose Raw Database Objects
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Need to map each response to understand which fields are sensitive.
- **Task:**
  - Create `/backend/src/dtos/` with transformers for each entity
  - `toPublicAppointment()`, `toPublicProfessional()`, `toPublicService()`
  - Ensure `auth_user_id`, `email`, internal data never leave the API
- **Estimate:** 2-3h

---

### BLOCK B — Pending Features

#### B1. Rescheduling by Professional
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Logic already defined (cancel + create with linkage), but needs:
  - New endpoint `POST /v1/appointments/:id/reschedule`
  - Validation: appointment belongs to authenticated professional
  - Validation: new slot available (run availability check)
  - Atomicity: cancel + create inside transaction/RPC
  - Return `old_appointment_id` in response
- **Note:** The public reschedule endpoint ALREADY EXISTS in api doc. Here it's implementation for professional-side with auth.
- **Dependency:** A1 (auth) must be ready
- **Estimate:** 3-4h

#### B2. Rescheduling Screen on Mobile (Professional)
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Need to create the flow on mobile:
  1. On appointments screen, "Reschedule" button
  2. Open new date/time picker (reuse booking flow components)
  3. Confirm → call endpoint → visual feedback
- **Dependency:** B1 (endpoint ready)
- **Estimate:** 3-4h

#### B3. BR Phone Validation with Mask
- **Complexity:** 🟢 GEMINI
- **Why:** 100% defined rule, no ambiguity:
  - Format: +55 + DDD (2 digits) + number (9 digits mobile / 8 digits landline)
  - Visual mask: (11) 99999-9999
  - Validation: regex + valid DDD check
  - Apply on booking form (guest) and future onboarding
- **Deliverables:**
  1. Utility function: `validateBRPhone(phone): { valid, formatted, raw }`
  2. React Native component: `PhoneInput` with mask
  3. Backend validation: updated Zod schema
- **Note:** According to progress.md, this item was postponed until navigation and real context exist. Can be implemented now as isolated component.
- **Estimate:** 2h

#### B4. Professional Onboarding UI
- **Complexity:** 🔴 OPUS 4.6
- **Why:** It's the most complex frontend flow. Involves:
  1. **Registration/Login Screen** — integrate with Supabase Auth
  2. **Onboarding Wizard** (multi-step):
     - Step 1: Basic info (name, phone, business type)
     - Step 2: Create services (name, duration, optional price)
     - Step 3: Define weekly availability (visual grid)
     - Step 4: Review and confirm
  3. **Progressive persistence** — save each step, allow going back
  4. **Slug generation** — create professional's public URL
  5. **"Done!" Screen** — show shareable link
- **Why Opus:** ~5 interconnected screens with complex state management, validations at each step, calls to multiple endpoints (some not yet existing), and UX decisions.
- **Endpoints that DON'T YET EXIST (must be created first):**
  - `POST /v1/professionals` (create profile)
  - `PUT /v1/professionals/:id` (update profile)
  - `POST /v1/professionals/:id/services` (create service)
  - `PUT /v1/professionals/:id/services/:sid` (edit service)
  - `POST /v1/professionals/:id/availability-rules` (create rule)
  - `PUT /v1/professionals/:id/availability-rules/:rid` (edit rule)
- **Estimate:** 10-15h (including new endpoints)
- **Recommendation:** Break into sub-tasks:
  - B4a: CRUD Endpoints (Claude Code) — 4h
  - B4b: Wizard Screens (Opus) — 6h
  - B4c: State management & integration (Opus) — 4h

---

### BLOCK C — Tests & Quality

#### C1. Domain Tests — Availability Engine
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Need to deeply understand business rules:
  - Given `availability_rule` 09:00-18:00, with 30min service → generate correct slots
  - Blocked slot 12:00-13:00 → remove affected slots
  - Confirmed appointment at 10:00 (30min) → slot 10:00 unavailable
  - Service buffer before/after → adjacent slots affected
  - Minimum booking notice of 30min → past slots removed
- **Framework:** Vitest (already TypeScript, ESM-friendly)
- **Estimate:** 4-5h

#### C2. Domain Tests — Overlap Prevention
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Test PostgreSQL exclusion constraints:
  - Two appointments at same time → one fails
  - Advisory lock → concurrent requests don't create duplicate
  - Blocked slot + appointment at same time → booking fails
- **Note:** Race condition load simulator ALREADY EXISTS (Phase 3.3). Expand.
- **Estimate:** 2-3h

#### C3. Domain Tests — Cancellation & Rescheduling
- **Complexity:** 🟢 GEMINI
- **Why:** Well-defined scenarios:
  - Cancel confirmed appointment → status = cancelled, cancelled_at filled
  - Cancel already cancelled → 409
  - Reschedule → old cancelled, new confirmed, correct linkage
  - Minimum cancel notice (2h) → cancel within 2h → error
- **Estimate:** 2h

#### C4. API Tests (Integration)
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Need to setup test environment with real database (or mocks):
  - Setup: Local Supabase or test database
  - Each test: seed → request → assert → cleanup
  - Coverage: all endpoints from api_v1.md
- **Estimate:** 5-6h

---

### BLOCK D — Technical Debt

#### D1. Remove Hardcoded IDs in Frontend
- **Complexity:** 🟢 GEMINI
- **Why:** Pure search-and-replace + context logic:
  - `DEMO_PROFESSIONAL_ID` → comes from auth context or deep link
  - `DEMO_SERVICE_ID` → comes from selection on screen
- **Dependency:** A1 (auth) + B4 (onboarding) ideally
- **Estimate:** 1-2h

#### D2. Separate Supabase Environments (Dev/Prod)
- **Complexity:** 🟡 CLAUDE CODE
- **Why:** Involves:
  - Create separate Supabase project for dev
  - Migration script to replicate schema
  - Environment variables per environment
  - CI/CD awareness (Railway deploys which env?)
- **Estimate:** 3-4h

#### D3. Fix react-native@0.83.0 vs 0.83.2
- **Complexity:** 🟢 GEMINI
- **Why:** `npm install react-native@0.83.2` and resolve breaking changes (if any).
- **Estimate:** 30min

---

### BLOCK E — Documentation & Deploy

#### E1. Update api_v1.md with New Endpoints
- **Complexity:** 🟢 GEMINI
- **Why:** Follow existing document pattern and add new endpoints.
- **Estimate:** 1h

#### E2. Update progress.md
- **Complexity:** 🟢 GEMINI
- **Why:** Mechanical: mark checkboxes, add new entries.
- **Estimate:** 30min

#### E3. Final Security Checklist
- **Complexity:** 🔴 OPUS 4.6
- **Why:** Holistic security review:
  - Audit all endpoints: auth ✓, ownership ✓, rate limit ✓, DTO ✓
  - Verify RLS policies cover all scenarios
  - SQL injection vectors (Supabase JS client is safe, but custom RPCs?)
  - CORS configuration
  - Webhook signature validation (WhatsApp)
  - Mass assignment: verify request bodies validated with Zod whitelist
  - Security headers (Helmet or equivalent)
- **Estimate:** 3-4h

---

## 4. Recommended Execution Order

```
SPRINT 1 — Security Foundation (5-7h)
├── A1. Auth Setup (Opus 4.6)          ← FIRST, everything depends on this
├── A3. Rate Limiting (Gemini)          ← parallel, independent
└── D3. Fix RN version (Gemini)         ← parallel, independent

SPRINT 2 — Hardening (4-6h)
├── A2. Ownership Checks (Claude Code)  ← depends on A1
├── A4. DTO Layer (Claude Code)         ← depends on A1
└── B3. Phone Validation (Gemini)       ← independent

SPRINT 3 — Rescheduling (6-8h)
├── B1. Reschedule Endpoint (Claude Code)  ← depends on A2
└── B2. Reschedule UI Mobile (Claude Code) ← depends on B1

SPRINT 4 — Tests (8-10h)
├── C1. Availability Tests (Claude Code)
├── C2. Overlap Tests (Claude Code)
├── C3. Cancel/Reschedule Tests (Gemini)
└── C4. Integration Tests (Claude Code)

SPRINT 5 — Onboarding (10-15h)
├── B4a. CRUD Endpoints (Claude Code)
├── B4b. Wizard Screens (Opus 4.6)
└── B4c. Integration (Opus 4.6)

SPRINT 6 — Closing (5-8h)
├── D1. Remove Hardcoded IDs (Gemini)
├── D2. Separate Environments (Claude Code)
├── E1. Update api_v1.md (Gemini)
├── E2. Update progress.md (Gemini)
└── E3. Security Audit (Opus 4.6)
```

---

## 5. Dependency Map

```
A1 (Auth) ─────┬──→ A2 (Ownership) ──→ B1 (Reschedule API) ──→ B2 (Reschedule UI)
               │
               ├──→ A4 (DTOs)
               │
               ├──→ B4a (CRUD Endpoints) ──→ B4b (Wizard) ──→ B4c (Integration)
               │                                                      │
               └──→ D1 (Remove Hardcoded) ←────────────────────────────┘

A3 (Rate Limit)  ← independent
B3 (Phone Valid)  ← independent
C1-C4 (Tests)    ← can run after A2
D2 (Env Split)    ← independent
D3 (RN Fix)       ← independent
E3 (Security)     ← LAST (depends on everything)
```

---

## 6. Agent Workload Summary

### 🟢 Gemini (well-defined, mechanical tasks)
| Task | Estimate |
|------|----------|
| A3. Rate Limiting | 1h |
| B3. BR Phone Validation | 2h |
| C3. Cancel/Reschedule Tests | 2h |
| D1. Remove Hardcoded IDs | 1.5h |
| D3. Fix RN version | 0.5h |
| E1. Update api_v1.md | 1h |
| E2. Update progress.md | 0.5h |
| **Total Gemini** | **~8.5h** |

### 🟡 Claude Code (context + moderate design decisions)
| Task | Estimate |
|------|----------|
| A2. Ownership Checks | 2.5h |
| A4. DTO Layer | 2.5h |
| B1. Reschedule Endpoint | 3.5h |
| B2. Reschedule UI Mobile | 3.5h |
| B4a. CRUD Endpoints | 4h |
| C1. Availability Tests | 4.5h |
| C2. Overlap Tests | 2.5h |
| C4. Integration Tests | 5.5h |
| D2. Separate Environments | 3.5h |
| **Total Claude Code** | **~32h** |

### 🔴 Opus 4.6 (architecture, trade-offs, high complexity)
| Task | Estimate |
|------|----------|
| A1. Auth Setup | 5h |
| B4b. Onboarding Wizard | 6h |
| B4c. Onboarding Integration | 4h |
| E3. Security Audit | 3.5h |
| **Total Opus** | **~18.5h** |

**Total estimated:** ~59h of work

---

## 7. Critical Attention Points

### ⚠️ Traps that will appear

1. **Auth + RLS on Supabase is treacherous**
   Supabase Auth works fine for basics, but when you have custom RPCs
   (`create_appointment_v1`), `auth.uid()` inside the RPC depends on JWT
   being passed correctly by the client. End-to-end testing is mandatory
   before proceeding.

2. **Onboarding is 30% of remaining work**
   B4 (Onboarding) alone is nearly 1/4 of total effort. It's tempting to do
   "quickly" but that's where UX complexity lives: multi-step form, progressive
   validation, partial persistence, and the weekly availability grid
   (which is basically a mini-scheduler visual).

3. **Availability tests will reveal edge cases**
   When C1 runs, it will probably find bugs in scenarios like:
   - 45min service on 15min grid (slot alignment)
   - Buffer before/after crossing with blocked slot
   - Daylight saving time (timezone shift)
   Budget extra time for C1.

4. **Hardcoded IDs are a time bomb**
   Frontend today works because `DEMO_PROFESSIONAL_ID` points to a real record.
   Once auth exists, frontend needs to get professional ID from logged-in user.
   If D1 isn't done alongside A1, the app breaks.

5. **WhatsApp worker needs auth awareness**
   WhatsApp worker (Phase 5.1) probably runs without auth context.
   Verify it continues working after auth/RLS changes.

---

## 8. "Done" Criteria for V1

- [ ] Professional can register, create services, and set hours
- [ ] Client can book as guest
- [ ] Professional can view schedule, cancel, reschedule, complete
- [ ] No professional endpoint works without valid JWT
- [ ] No appointment overlaps another (constraint + test proving it)
- [ ] BR phone validated on booking
- [ ] Zero hardcoded IDs in frontend
- [ ] Domain tests passing (availability, overlap, cancel, reschedule)
- [ ] Security checklist 100%
- [ ] Dev/prod environments separated
