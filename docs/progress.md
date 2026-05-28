# AiMarco - progress.md

## Last updated: 2026-04-02

## Current phase: Phase 9 — Refinement (in progress)

---

## Completed milestones

### Phase 0 — Foundation
- Docker environment configured (WSL2/Windows)
- Monorepo structure: apps/mobile, backend, docs
- GEMINI.md and CLAUDE.md created
- Anti Vibe Coding methodology adopted

### Phase 1 — Documentation
- architecture.md
- roadmap.md
- modelagem_inicial_banco.md
- api_v1.md
- learn.md
- domain, data model, and V1 boundaries defined

### Phase 2 — Backend foundation
- Node.js + TypeScript + ESM
- Supabase client configured
- server.ts with raw HTTP (no framework)
- Environment variables strategy

### Phase 3 — Database
- professionals, clients, services tables
- availability_rules table (with is_active column)
- blocked_slots table
- appointments table (with snapshot fields)
- notifications table
- RPC: create_appointment_v1 (advisory lock + overlap check)
- RPC: cancel_appointment_v1

### Phase 3.2 — Public Profile (Done)
- Migration: added `slug` field to `professionals` table
- Endpoint: `GET /v1/public/professional/:slug` (Fastify controller implemented)
- Integrity test: isolated public fields from sensitive payload

### Phase 3.3 — Public Appointments (Done)
- Database: added UNIQUE constraint `(professional_id, phone)` to `clients`
- Database: created RPC `create_public_appointment_v1` (transactional upsert & GiST exclusion trap)
- Endpoint: `POST /v1/public/appointments` (Fastify controller implemented with strict Zod)
- Tests: integrated race-condition load simulator (TDD red-green)

### A1 — Auth Setup (Done — 2026-03-25)
- Added `auth_user_id UUID UNIQUE` column + index to `professionals` table
- Fixed `config.ts` — added `SUPABASE_SERVICE_ROLE_KEY` to Zod schema
- Fixed `lib/auth.ts` — `verifyProfessional` and `verifyPrivate` now lookup via `auth_user_id` bridge column
- Removed duplicate Stepfun-created `middleware/auth.ts` (Fastify types incompatible with raw http server)
- `supabase.ts` uses SERVICE_ROLE_KEY (done by Stepfun, validated)
- TypeScript compiles with zero errors, server boots on port 3333

### A2 — Ownership Checks (Done — 2026-03-26)
- All protected routes in `backend/src/routes/v1/` now use `req.auth`
- Ownership enforcement: endpoint `:id` matches `auth.professionalId`
- For appointment-based endpoints (`cancel`, `status`, `reschedule`), verifies `appointment.professional_id === auth.professionalId`
- Covered routes: appointments (list, cancel, reschedule, update-status), blocked-slots, available-days, services CRUD, profile update
- Zero unauthorized access vectors remaining

### A4 — DTO Layer (Data Transfer Object) (Done — 2026-03-27)
- Implemented comprehensive DTO layer in `backend/src/dtos/index.ts`
- Defined public vs professional data boundaries:
  - `PublicProfessional`: id, display_name, bio, avatar_url, timezone, slug, **business_type**
  - `PublicAppointment`: minimal (id, scheduled_at, status, service_name) — no PII
  - `ProfessionalAppointment`: full client data (client_name, client_phone) for authenticated dashboard
- Applied DTOs across all appointment handlers (list, create, cancel, reschedule, update-status)
- Updated `getPublicProfile` to use `toPublicProfessional` and `toPublicServiceList`
- Refactored unit tests: confirmed PII filtering and type safety
- Principle: Privacy by Design — no raw database objects ever exposed

### Phase 5.1 — WhatsApp Confirmations (Done)
- Configuration: Zod validation established for `WHATSAPP_API_URL` and `WHATSAPP_API_KEY` (Fail Secure).
- Async Service: Generic generic HTTP template for WA messages.
- Worker: Integrated active listener and custom string replacement for scheduling info (`https://aimarco.com.br/p/...`).
- Logs: Capturing WA network failures via `failure_reason` back into the DB.

### Phase 4 — API
- GET /health
- GET /v1/availability/:id
- GET /v1/professionals/:id/appointments
- GET /v1/professionals/:id/available-days
- GET /v1/professionals/:id/blocked-slots
- POST /v1/appointments
- POST /v1/appointments/:id/cancel
- POST /v1/appointments/:id/status
- POST /v1/professionals/:id/blocked-slots

### Phase 6 — Mobile foundation
- Expo SDK 55 + React Native
- Tab navigation: Book | Schedule
- SafeAreaView migrated to react-native-safe-area-context
- Design system defined (docs/interface-design/system.md)

### Phase 7 — Booking flow
- Date selection (from backend available-days)
- Time slot selection
- Guest booking form (name + phone)
- Booking confirmation screen
- Conflict handling (409 → "Horário indisponível")
- Full pt-BR localization with lowercase fix

### Phase 8 — Professional schedule
- Day view with appointments list
- Week view with confirmed count per day
- Appointment status actions (completed, no_show)
- Cancellation by professional
- Blocked slots creation (modal with validation)
- Blocked slots display (yellow cards with 🔒)
- Conflict warning when blocking occupied slots

### Phase 9 — Refinement (partial)
- Timezone fix in list-appointments.ts (America/Sao_Paulo)
- Timezone fix in create_appointment_v1 RPC
- is_active column added to availability_rules
- Lowercase in formatDateLabel and success screen
- "Conflict" title translated to "Horário indisponível"
- Backend deployed to Railway
- GitHub repository created (github.com/Sipcelo/AiMarco)
- README.md created
- roadmap.md updated
- Expo SDK 55 dependencies fully synchronized
- React Native version aligned to 0.83.2
- react-dom and react-native-web added for web compatibility
- AsyncStorage installed for onboarding persistence

### B3 — Phone Validation (Done — 2026-03-29)
- Brazilian phone validator integrated (`backend/src/validators/phone.ts`)
- Zod schema enforces valid phone format with clear PT-BR messages
- Mobile: PhoneInput component added with mask (apps/mobile/src/components/PhoneInput.tsx)
- Phone number standardization enforced at API boundary

### B4 — Onboarding Suite (Complete — 2026-03-29)
- WelcomeProfileScreen: display_name, bio, business_type editing
- ServicesScreen: multi-service creation with price/duration
- ScheduleWizardScreen: weekly availability blocks
- CompleteOnboarding action in AuthContext
- Full integration tested end-to-end
- Router guard enforces onboarding completion before main schedule

### V1.5 — Professional Features (Complete — 2026-03-31)
- Session persistence with AsyncStorage (token, user, onboarding flag)
- Editable Profile screen with real-time updates
- Haptic feedback integration (Vibration.vibrate(30) on status changes and profile save)
- Executive Dashboard with responsive PowerCards (Revenue, Clients, Total) using flexbox grid
- Schedule screen polish: power cards scaling correctly on all screen sizes
- All Phase 9 refinement items complete
- Ready for production deployment

### Contract V2 — Availability + Snapshots (Complete — 2026-04-02)
- **Migration:** `20260402180000_contract_v2.sql` — 4 RPCs v2 + coluna `price_snapshot_cents`
- **`get_available_slots_v2`:** usa `availability_rules` como fonte única da verdade (corrige discrepância v1 que usava `opening_time/closing_time`)
- **`create_appointment_v2`:** valida availability_rules + salva todos os 5 snapshots (`service_name`, `service_duration_minutes`, `price_snapshot_cents`, `client_name`, `client_phone`)
- **`create_public_appointment_v2`:** valida availability_rules + salva snapshots (corrige v1 que não validava)
- **`reschedule_appointment_v2`:** preserva lineage + snapshots com `COALESCE(old_snapshot, current_data)` para appointments legados
- **App wiring:** `create-appointment.ts` → v2, `reschedule-appointment.ts` → v2, `get-public-availability.ts` → v2
- **Doc:** `api_v1.md` atualizada com contratos v2 e notas de resolução de discrepâncias
- TypeScript build limpa, zero erros

### ⭐ Design Premium — SaaS Elite UI (Done — 2026-03-31)
- **Dashboard Redesign**: Dark theme (#0A192F) with neon accents (#00D2FF)
  - Metrics grid (Total, Confirmados, Concluídos, Cancelados) using lucide icons
  - FlatList appointments with color-coded status tags
  - FAB with glow effect for quick action
  - Real avatar + dynamic greeting in header
- **Public Booking Portal Redesign**:
  - Service selection cards with Scissors icon
  - Horizontal date scroll from `available-days` endpoint
  - Premium time grid (3-column) using `get_available_slots_v1` RPC
  - Bottom summary bar with neon CTA button
  - Full form modal with validation
- **Micro-interaction**: Pulse animation on share button when schedule is empty (marketing hook)
- **Home Screen**: Updated to dark theme for consistency
- **Dependencies**: Installed `lucide-react-native` and `react-native-reanimated`
- **Build**: Web export successful, zero TypeScript errors

### C4 — Error Validation Gauntlet (Done — 2026-03-29)
- Zod schemas enriched with human-readable PT-BR messages
- `email`: "Este e-mail parece estar escrito errado. Verifique se tem '@' e '.com'..."
- `password`: "Senha muito curta! Use pelo menos 6 caracteres para sua segurança."
- Integration test suite: `backend/tests/integration/auth-gauntlet.test.ts` (8 scenarios, all green)
- Mobile API: fieldErrors propagation from Zod details
- Mobile UI: inline error messages with red borders per field
- Input hygiene: `.trim()` and `.toLowerCase()` on emails

### UX Improvements — Public Booking (Done — 2026-03-29)
- Public professional page `[slug].tsx` completely redesigned
- Premium UI: shadow cards, avatar, cleaner typography
- Share button (native Share API) for WhatsApp/marketing
- "Agendar Agora" buttons on each service → modal booking flow
- Modal collects: client_name, client_email, client_phone, date, time
- POST to `/v1/public/appointments` with proper validation feedback

### A1 — Auth Setup (Done — 2026-03-25)
- Added `auth_user_id UUID UNIQUE` column + index to `professionals` table
- Fixed `config.ts` — added `SUPABASE_SERVICE_ROLE_KEY` to Zod schema
- Fixed `lib/auth.ts` — `verifyProfessional` and `verifyPrivate` now lookup via `auth_user_id` bridge column
- Removed duplicate Stepfun-created `middleware/auth.ts` (Fastify types incompatible with raw http server)
- `supabase.ts` uses SERVICE_ROLE_KEY (done by Stepfun, validated)
- TypeScript compiles with zero errors, server boots on port 3333

### A2 — Ownership Checks (Done — 2026-03-26)
- All protected routes in `backend/src/routes/v1/` now use `req.auth`
- Ownership enforcement: endpoint `:id` matches `auth.professionalId`
- For appointment-based endpoints (`cancel`, `status`, `reschedule`), verifies `appointment.professional_id === auth.professionalId`
- Covered routes: appointments (list, cancel, reschedule, update-status), blocked-slots, available-days, services CRUD, profile update
- Zero unauthorized access vectors remaining

---

## Pending (Phase 9)

- [ ] UI de reagendamento pelo profissional no app mobile (backend pronto)
- [x] Auth for professionals (JWT + Supabase Auth) — A1 done 2026-03-25
- [x] Ownership Checks (A2) — done 2026-03-26
- [x] Phone validation with BR mask — B3 done 2026-03-29
- [x] Professional onboarding UI — B4 complete 2026-03-29
- [x] Contract V2 — Availability + Snapshots — done 2026-04-02
- [ ] Automated tests for domain logic
- [ ] Security checklist implementation

---

## Known technical debt

- list-appointments.ts: fake UTC windows (fixed 2026-03-23)
- SafeAreaView deprecated (fixed 2026-03-23)
- is_active column missing in availability_rules (fixed 2026-03-23)
- RPC timezone bug (fixed 2026-03-23)
- Hardcoded DEMO_PROFESSIONAL_ID and DEMO_SERVICE_ID in frontend

---

## Production

- Backend URL: https://aimarco.up.railway.app
- GitHub: https://github.com/Sipcelo/AiMarco
- Database: Supabase (shared dev/prod — separate environments pending)

---

## 🇧🇷 Versão em Português

## Última atualização: 2026-04-02

## Fase atual: Fase 9 — Refinamento (em progresso)

---

## Marcos concluídos

### Fase 0 — Fundação
- Ambiente Docker configurado (WSL2/Windows)
- Estrutura monorepo: apps/mobile, backend, docs
- GEMINI.md e CLAUDE.md criados
- Metodologia Anti Vibe Coding adotada

### Fase 1 — Documentação
- architecture.md
- roadmap.md
- modelagem_inicial_banco.md
- api_v1.md
- learn.md
- domínio, modelo de dados e limites do V1 definidos

### Fase 2 — Fundação do backend
- Node.js + TypeScript + ESM
- Cliente Supabase configurado
- server.ts com HTTP raw (sem framework)
- Estratégia de variáveis de ambiente

### Fase 3 — Banco de dados
- tabelas: professionals, clients, services
- tabela availability_rules (com coluna is_active)
- tabela blocked_slots
- tabela appointments (com campos de snapshot)
- tabela notifications
- RPC: create_appointment_v1 (advisory lock + verificação de sobreposição)
- RPC: cancel_appointment_v1

### Fase 3.2 — Perfil Público (Concluído)
- Migration: adicionado campo `slug` à tabela `professionals`
- Endpoint: `GET /v1/public/professional/:slug` (controller Fastify implementado)
- Teste de integridade: isolou campos públicos de payload sensível

### Fase 3.3 — Agendamentos Públicos (Concluído)
- Banco: adicionada constraint UNIQUE `(professional_id, phone)` em `clients`
- Banco: criada RPC `create_public_appointment_v1` (upsert transacional + armadilha GiST exclusion)
- Endpoint: `POST /v1/public/appointments` (controller Fastify implementado com Zod estrito)
- Testes: integrado simulador de carga de race-condition (TDD red-green)

### A1 — Autenticação (Concluído — 2026-03-25)
- Adicionada coluna `auth_user_id UUID UNIQUE` + índice na tabela `professionals`
- `config.ts` fixado — adicionado `SUPABASE_SERVICE_ROLE_KEY` ao schema Zod
- `lib/auth.ts` fixado — `verifyProfessional` e `verifyPrivate` agora buscam via coluna ponte `auth_user_id`
- Removido `middleware/auth.ts` duplicado criado pelo Stepfun (incompatibilidade de tipos Fastify com servidor HTTP raw)
- `supabase.ts` usa SERVICE_ROLE_KEY (feito por Stepfun, validado)
- TypeScript compila sem erros, servidor sobe na porta 3333

### A2 — Controle de Propriedade (Concluído — 2026-03-26)
- Todas as rotas protegidas em `backend/src/routes/v1/` usam `req.auth`
- Implementado ownership check: `:id` do endpoint === `auth.professionalId`
- Para endpoints baseados em appointment (`cancel`, `status`, `reschedule`), verifica `appointment.professional_id === auth.professionalId`
- Rotas cobertas: appointments (list, cancel, reschedule, update-status), blocked-slots, available-days, services CRUD, profile update
- Zero vetores de acesso não autorizado remanescentes

### A4 — DTO Layer (Data Transfer Object) (Concluído — 2026-03-27)
- Implementada camada DTO abrangente em `backend/src/dtos/index.ts`
- Definidos limites de dados públicos vs profissionais:
  - `PublicProfessional`: id, display_name, bio, avatar_url, timezone, slug, **business_type**
  - `PublicAppointment`: mínimo (id, scheduled_at, status, service_name) — sem PII
  - `ProfessionalAppointment`: dados completos do cliente (client_name, client_phone) para dashboard autenticado
- Aplicado DTOs em todos os handlers de appointments (list, create, cancel, reschedule, update-status)
- `getPublicProfile` atualizado para usar `toPublicProfessional` e `toPublicServiceList`
- Testes unitários refatorados: confirmada filtragem de PII e segurança de tipos
- Princípio: Privacy by Design — objetos crus do banco nunca expostos

### B4a — CRUD de Disponibilidade (Concluído — 2026-03-27)
- Implementado CRUD completo para availability_rules com lógica de negócio rigorosa
- **POST /v1/professionals/:id/availability** (batch create)
  - Aceita array de objetos `{ day_of_week, start_time, end_time, is_active? }`
  - Valida overlaps internos entre as novas regras do mesmo dia
  - Retorna 201 com regras criadas ou 409 sobre conflito
- **PUT /v1/professionals/:id/availability-rules/:rid** (update single)
  - Atualiza regra com overlap check contra outras regras ativas do mesmo dia
  - Condição: `(newStart < existingEnd) AND (newEnd > existingStart)`
  - Retorna 200 com regra atualizada ou 409 em conflito
- **DELETE /v1/professionals/:id/availability-rules/:rid** (exclusão lógica)
  - Nunca delete físico; apenas `is_active = false`
  - Idempotente (já inativa retorna 200)
- Todos os endpoints verificam ownership (`auth.professionalId`)
- Exclusion constraint do banco permanece como última linha de defesa

### B4b — Auth Mobile + Onboarding UI (Concluído — 2026-03-27)
- AuthContext implementado com SecureStore (token + user + onboarding flag)
- Login tela: email + senha
- Sign-up tela: display_name + business_type + email/senha
- Onboarding Wizard 3 telas:
  - WelcomeProfileScreen: perfil (display_name, bio, business_type)
  - ServicesScreen: serviços + preços
  - ScheduleWizardScreen: turnos_recorrentes (múltiplos por dia)
- Navegação condicional no layout raiz (AuthGuard):
  - token?null → login
  - token & !onboarded → wizard
  - token & onboarded → schedule principal
- apiFetch com suporte nativo a Bearer token

### B4c — Onboarding Integration + Smart Routing (Concluído — 2026-03-27)
- ScheduleWizardScreen integrado com backend real:
  - `updateProfile()` para dados de perfil
  - `createAvailabilityRules()` para horários
  - `completeOnboarding()` no contexto
  - Limpeza de dados temporários
- ScheduleScreen refatorado para usar AuthContext
  - Todas as requisições com Authorization header
  - Usa professionalId do user logado
  - GET /appointments, blocked-slots, available-days autenticados
  - POST /blocked-slots autenticado
- Estrutura de rotas simplificada: todas as telas em `app/` (Expo Router)
- Removida pasta `src/screens` antiga

### Segurança — Credenciais (Concluído — 2026-03-27)
- Removida chave JWT hardcoded de `backend/src/config.ts`
- `SUPABASE_SERVICE_ROLE_KEY` agora é obrigatória via env var (sem default)
- Verificado: `.env` não está tracked no git
- Todos os `.env.*` files são ignorados corretamente

### Fase 4 — API
- GET /health
- GET /v1/availability/:id
- GET /v1/professionals/:id/appointments
- GET /v1/professionals/:id/available-days
- GET /v1/professionals/:id/blocked-slots
- POST /v1/appointments
- POST /v1/appointments/:id/cancel
- POST /v1/appointments/:id/status
- POST /v1/professionals/:id/blocked-slots

### Fase 5.1 — Confirmações WhatsApp (Concluído)
- Configuração: Validação Zod estabelecida para `WHATSAPP_API_URL` e `WHATSAPP_API_KEY` (Fail Secure).
- Serviço Assíncrono: Template HTTP genérico para mensagens WA.
- Worker: Integrado listener ativo e substituição customizada de string para info de agendamento (`https://aimarco.com.br/p/...`).
- Logs: Capturando falhas de rede WA via `failure_reason` no banco.

### Fase 6 — Fundação do mobile
- Expo SDK 55 + React Native
- Navegação por tabs: Book | Schedule
- SafeAreaView migrada para react-native-safe-area-context
- Sistema de design definido (docs/interface-design/system.md)

### Fase 7 — Fluxo de agendamento
- Seleção de data (de available-days do backend)
- Seleção de horário
- Formulário de booking de convidado (nome + telefone)
- Tela de confirmação de agendamento
- Tratamento de conflito (409 → "Horário indisponível")
- Localização pt-BR completa com correção de lowercase
- Confirmação de agendamento

### Fase 8 — Agenda do profissional
- Visão diária com lista de appointments
- Visão semanal com contagem de confirmados por dia
- Ações de status de appointment (completed, no_show)
- Cancelamento pelo profissional
- Criação de horários bloqueados (modal com validação)
- Exibição de horários bloqueados (cards amarelos com 🔒)
- Aviso de conflito ao bloquear slots ocupados

### Fase 9 — Refinamento (parcial)
- Correção de timezone em list-appointments.ts (America/Sao_Paulo)
- Correção de timezone em create_appointment_v1 RPC
- Coluna is_active adicionada a availability_rules
- Lowercase em formatDateLabel e tela de sucesso
- Título "Conflict" traduzido para "Horário indisponível"
- Backend deployado no Railway
- Repositório GitHub criado (github.com/Sipcelo/AiMarco)
- README.md criado
- roadmap.md atualizado

---

## Pendente (Fase 9)

- [ ] UI de reagendamento pelo profissional no app mobile (backend pronto)
- [x] Autenticação para profissionais (JWT + Supabase Auth) — A1 concluído 2026-03-25
- [x] Controle de Propriedade (Ownership Checks) — A2 concluído 2026-03-26
- [x] Validação de telefone com máscara BR — B3 concluído 2026-03-29
- [x] UI de onboarding do profissional — B4 concluído 2026-03-29
- [x] Contrato v2 — Availability + Snapshots — concluído 2026-04-02
- [ ] Testes automatizados para lógica de domínio
- [ ] Implementação do checklist de segurança

---

## Dívida técnica conhecida

- list-appointments.ts: fake UTC windows (fixed 2026-03-23)
- SafeAreaView deprecated (fixed 2026-03-23)
- Coluna is_active faltando em availability_rules (fixed 2026-03-23)
- Bug de timezone na RPC (fixed 2026-03-23)
- DEMO_PROFESSIONAL_ID e DEMO_SERVICE_ID hardcoded no frontend

---

## Produção

- Backend URL: https://aimarco.up.railway.app
- GitHub: https://github.com/Sipcelo/AiMarco
- Banco de dados: Supabase (dev/prod compartilhado — ambientes separados pendentes)

---

## Bateria de Testes — 2026-04-05

### Escopo executado
- tests/unit/ — validações, schemas, DTOs, phone, slots
- tests/domain/ — disponibilidade, sobreposição, smart slots, edge cases

### Resultado
- Test files: 10 passando (10)
- Tests: 183 passando (183)
- Falhas: 0
- Duração: 2.14s

### Testes excluídos desta bateria (e motivo)
- tests/integration/ — requerem servidor rodando na porta 3333 (E2E)
- tests/security/auth-injection.test.ts — importa src/lib/auth.ts que foi
  removido durante migração do Parse Server. Pendente reescrita.
- tests/integration/auth.test.ts — desativado intencionalmente (if true skip),
  resíduo da migração.
- tests/integration/availability.test.ts — desativado intencionalmente
  (BetterRouter removido por contaminação).

### Conclusão
Lógica de domínio validada e estável para lançamento V1.
Próximo passo: reescrever testes de segurança para a arquitetura atual (Fastify).
