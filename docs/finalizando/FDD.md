# Feature Design Document (FDD) — AiMarco V1

> **Status:** V1 / pré-piloto
> **Última atualização:** 2026-05-31
> **Escopo:** Backend (Fastify + Supabase), Web (React/Vite) e Mobile (Expo/React Native)

---

## 1. Project Name

**AiMarco V1** — plataforma de agendamento para profissionais de beleza (barbearia, manicure/pedicure, cabelo).

## 2. Overview

AiMarco permite que profissionais autônomos de beleza publiquem uma agenda própria e recebam agendamentos de clientes sem que o cliente precise criar conta. O profissional gerencia perfil, serviços, disponibilidade semanal e bloqueios pela web (onboarding) e pelo app mobile (agenda do dia a dia), enquanto o cliente final agenda por uma página pública via `slug`. O sistema prioriza **confiabilidade de agendamento** — prevenção de sobreposição (overlap), snapshots imutáveis e timezone `America/Sao_Paulo` — acima de complexidade prematura.

---

## 3. Arquitetura geral

```txt
┌────────────┐    HTTPS/JSON     ┌──────────────────────┐     RPC/SQL     ┌──────────────┐
│  Web (SPA) │ ────────────────► │  Backend Fastify v1  │ ──────────────► │  Supabase    │
│  React/Vite│                   │  (REST + DTO + Auth) │   (atomic RPC)  │  PostgreSQL  │
└────────────┘                   └──────────┬───────────┘                 └──────┬───────┘
                                            │                                    │ LISTEN/NOTIFY
┌────────────┐    HTTPS/JSON                │                              ┌──────▼───────┐
│ Mobile App │ ───────────────────────────►─┘                              │   Worker     │
│ Expo/RN    │                                                             │ (WhatsApp)   │
└────────────┘                                                             └──────────────┘
```

- **Backend:** Fastify 5 + TypeScript. Camadas: `routes/v1/**` (HTTP) → `lib/**` (lógica de domínio) → `supabase` (RPC/queries). DTOs em `dtos/index.ts` impedem vazamento de PII. Validação com Zod em `shared/schemas/**`.
- **Web:** React + Vite. Onboarding do profissional e página pública de booking (`/p/:slug`).
- **Mobile:** Expo/React Native (Expo Router). Login, onboarding e agenda do profissional; push notifications via Expo.
- **Worker:** processo separado que escuta `LISTEN new_notification` no Postgres e dispara WhatsApp.
- **Banco:** Supabase/PostgreSQL com RPCs atômicas e constraints de exclusão GiST para overlap.

---

## 4. Modules / Features

### 4.1 Backend — Authentication

- **Name:** `auth` (`routes/v1/auth/*`, `middleware/auth.ts`)
- **Purpose:** Cadastro e login de profissionais; validação de JWT Supabase e resolução do `professionalId` em rotas protegidas.
- **Inputs:**
  - Signup: `{ email, password, display_name, phone, business_type }` (`SignupSchema`)
  - Login: `{ email, password }` (`LoginSchema`)
  - Rotas protegidas: header `Authorization: Bearer <jwt>`
- **Outputs:** Sessão/JWT do Supabase, dados básicos do profissional; em rotas protegidas, `request.auth = { userId, professionalId }`.
- **Key data structures:** `SignupInput`, `LoginInput`, `AuthContext { userId, professionalId }`.
- **Dependencies:** Supabase Auth (`supabase.auth.getUser`), tabela `professionals`, `BrazilianPhoneSchema`.
- **Edge cases:** token com caracteres de controle (rejeitado antes do Supabase), token inválido/expirado (401), profissional não vinculado ao `auth_user_id` (403), email duplicado, telefone inválido, `business_type` fora do enum.

### 4.2 Backend — Professional Profile

- **Name:** `profile` (`routes/v1/profile/*`)
- **Purpose:** Ler e atualizar o perfil do profissional autenticado (incluindo `slug`, timezone, intervalos de slot e avisos mínimos).
- **Inputs:** `ProfessionalUpdateSchema` (display_name, full_name, bio, avatar_url, timezone, slot_interval_minutes ∈ {15,30,60}, minimum_booking_notice_minutes, business_type, phone, slug).
- **Outputs:** `OwnProfessional` (perfil completo do próprio dono, com email/phone) via DTO.
- **Key data structures:** `ProfessionalUpdate`, `OwnProfessional`, `PublicProfessional`.
- **Dependencies:** `middleware/auth`, DTO layer, tabela `professionals`.
- **Edge cases:** slug duplicado / formato inválido (regex kebab-case), bio > 500 chars, avatar_url inválida, ownership (só edita o próprio perfil).

### 4.3 Backend — Services CRUD

- **Name:** `services` (`routes/v1/services/*`)
- **Purpose:** Gerenciar os serviços agendáveis de um profissional.
- **Inputs:** `ServiceCreateSchema` (name, duration_minutes>0, price_cents?, description?), `ServiceUpdateSchema` (campos opcionais + is_active).
- **Outputs:** `PublicService` (sem `professional_id` nem audit fields).
- **Key data structures:** `ServiceCreate`, `ServiceUpdate`, `PublicService`.
- **Dependencies:** `middleware/auth`, DTO layer, tabela `services`.
- **Edge cases:** duração ≤ 0, nome duplicado `(professional_id, name)`, serviço inativo não deve aparecer no booking público, ownership na edição/exclusão.

### 4.4 Backend — Availability Rules

- **Name:** `availability` (`routes/v1/availability/*`, `lib/get-availability.ts`, `lib/get-available-days.ts`, `lib/calculate-availability.ts`)
- **Purpose:** Definir horários de trabalho semanais recorrentes e calcular slots livres para um serviço/data.
- **Inputs:**
  - Regras: `AvailabilityRuleSchema` (day_of_week 0–6, start_time/end_time `HH:mm`, remove?)
  - Cálculo: `workingIntervals`, `appointments` ocupados, `blockedSlots`, `serviceDuration`, `slotGranularity`
- **Outputs:** Lista de regras; array de horários disponíveis `["HH:mm", ...]`; dias disponíveis.
- **Key data structures:** `AvailabilityRule`, `TimeInterval`, `OccupiedSlot`, `CalculateAvailabilityParams`.
- **Dependencies:** `middleware/auth` (escrita), tabela `availability_rules`, blocked_slots, appointments.
- **Edge cases:** múltiplas janelas no mesmo dia (manhã+tarde), buffer de 30 min entre agendamentos, end_time ≤ start_time, ranges sobrepostos no mesmo dia (constraint GiST), timezone `America/Sao_Paulo`, granularidade 15/30/60.

### 4.5 Backend — Appointments (booking, cancel, reschedule, status)

- **Name:** `appointments` (`routes/v1/appointments/*`, `routes/v1/public/post-appointment.ts`, `lib/create-appointment.ts`, `lib/cancel-appointment.ts`, `lib/update-appointment-status.ts`, `lib/can-book-slot.ts`)
- **Purpose:** Criar, cancelar, reagendar e atualizar status de agendamentos com garantia atômica de não-overlap.
- **Inputs:**
  - Criar: `AppointmentCreateSchema` (professional_id, service_id, scheduled_at ISO8601, client_name, client_phone)
  - Reagendar: `RescheduleRequestSchema` (new_scheduled_at)
  - Status: enum `confirmed | cancelled | completed | no_show`
- **Outputs:** Agendamento criado (id, snapshots); para o profissional `ProfessionalAppointment` (com PII); para rotas públicas `PublicAppointment` (sem PII).
- **Key data structures:** `AppointmentCreate`, `RescheduleRequest`, `ProfessionalAppointment`, `PublicAppointment`.
- **Dependencies:** RPC atômica `create_appointment_v1`, DTO layer, `notifications` (trigger → worker).
- **Edge cases:**
  - **Overlap simultâneo** (race condition) → RPC + constraint GiST → "Selected slot is no longer available."
  - Serviço inexistente/não pertencente ao profissional, horário fora da disponibilidade, horário bloqueado.
  - Cancelamento/reagendamento de agendamento alheio (ownership).
  - Reagendamento para horário ocupado; reagendamento preserva histórico via `rescheduled_from_appointment_id`.
  - Phone inválido, slug inexistente, snapshots obrigatórios sempre populados.

### 4.6 Backend — Blocked Slots

- **Name:** `blocked-slots` (`routes/v1/professionals/*blocked-slots*`, `lib/create-blocked-slot.ts`, `lib/list-blocked-slots.ts`)
- **Purpose:** Registrar janelas pontuais de indisponibilidade (folgas, pausas).
- **Inputs:** `BlockedSlotCreateSchema` (starts_at, ends_at, reason?) com refine `ends_at > starts_at`.
- **Outputs:** Bloqueio criado; lista de bloqueios do profissional.
- **Key data structures:** `BlockedSlotCreate`, `BlockedSlot`.
- **Dependencies:** `middleware/auth`, tabela `blocked_slots` (constraint GiST de não-overlap).
- **Edge cases:** ends_at ≤ starts_at, bloqueios sobrepostos, ownership.

### 4.7 Backend — Public Booking Surface

- **Name:** `public` (`routes/v1/public/*`)
- **Purpose:** Expor perfil, serviços e disponibilidade ao cliente final (sem autenticação) e receber agendamentos guest.
- **Inputs:** `slug`/`id` na URL; corpo de criação de agendamento (rate-limited 10/min por IP).
- **Outputs:** `PublicProfessional`, `PublicService[]`, horários disponíveis, agendamento criado.
- **Key data structures:** `PublicProfessional`, `PublicService`, `PublicAppointment`.
- **Dependencies:** DTO layer (zero PII vazada), rate limit (`@fastify/rate-limit`), CORS allowlist.
- **Edge cases:** slug inexistente, profissional inativo, serviço inativo, flood de requisições (rate limit), CORS de origem não permitida.

### 4.8 Backend — Notifications Worker

- **Name:** `worker` (`worker.ts`, `services/whatsapp.ts`, `lib/send-push-notification.ts`)
- **Purpose:** Entregar notificações (WhatsApp/push) de forma assíncrona e resiliente a partir de eventos do banco.
- **Inputs:** `LISTEN new_notification` (payload = notification id); registros da tabela `notifications`.
- **Outputs:** Mensagens WhatsApp (criado/cancelado/reagendado); atualização de status `pending → processing → sent | failed`.
- **Key data structures:** `notifications` (recipient_type, channel, template_key, status, scheduled_for, failure_reason).
- **Dependencies:** `pg` (LISTEN/NOTIFY), Supabase, WhatsApp API, Expo push.
- **Edge cases:** concorrência entre workers (claim via `UPDATE WHERE status='pending'`), notificações `processing` órfãs (cleanup a cada 5 min), falha de envio (registra `failure_reason`, não derruba o worker), templates não configurados (simulação/log).

### 4.9 Web — Onboarding (Professional)

- **Name:** `onboarding` (`web/src/app/components/onboarding/*`, `App.tsx`, `services/onboarding.api.ts`)
- **Purpose:** Fluxo guiado de cadastro do profissional: signup → perfil → serviços → disponibilidade → conclusão.
- **Inputs:** Formulários (SignUp, ProfileSetup, ServicesSetup, AvailabilitySetup).
- **Outputs:** Profissional configurado e pronto para receber agendamentos; `slug` ativo.
- **Key data structures:** mesmas do backend (Service, AvailabilityRule, ProfessionalUpdate).
- **Dependencies:** Backend v1, componentes UI (`Button`, `Input`, `ProgressBar`, `ServiceCard`, `Toggle`).
- **Edge cases:** validação client-side espelhando Zod, slug em uso, estados de loading/empty, erros de API.

### 4.10 Web — Public Booking Page

- **Name:** `booking` (`web/src/app/pages/ProfessionalBookingPage.tsx`, `pages/booking/*`, `pages/LandingPage.tsx`)
- **Purpose:** Página pública (`/p/:slug`) onde o cliente escolhe serviço → data/hora → preenche dados → confirma.
- **Inputs:** `slug` da rota; seleção de serviço, data/hora; `client_name`, `client_phone`.
- **Outputs:** Agendamento confirmado + tela de sucesso (com link de contato Bitly/WhatsApp).
- **Key data structures:** steps (ServiceStep, DateTimeStep, ClientStep, ConfirmStep, BookingSuccess), `StepperBar`.
- **Dependencies:** `data/public.api.ts`, rotas públicas do backend.
- **Edge cases:** rota legada `/booking/:slug` (deve ser redirecionada/removida — ver CLAUDE.md), slot indisponível ao confirmar, phone inválido, slug inexistente, crash de etapa.

### 4.11 Mobile — Auth & Session

- **Name:** `mobile-auth` (`apps/mobile/app/login.tsx`, `signup.tsx`, `src/contexts/AuthContext.tsx`, `src/services/api.ts`)
- **Purpose:** Login/signup, hidratação de sessão, logout limpo e tratamento global de 401.
- **Inputs:** credenciais; sessão persistida.
- **Outputs:** sessão ativa, navegação para agenda; logout limpa estado sensível.
- **Key data structures:** `AuthContext`, `BACKEND_URL`, handler global de 401 (`setUnauthorizedHandler`).
- **Dependencies:** Backend auth, Expo Constants, secure storage.
- **Edge cases:** token não persistido indevidamente, estado sensível limpo no logout, loop de re-render no 401 (guard `isHandling401`), URLs não hardcoded.

### 4.12 Mobile — Onboarding & Profile

- **Name:** `mobile-onboarding` (`app/welcome-profile.tsx`, `profile.tsx`, `services.tsx`, `schedule-wizard.tsx`, `src/screens/onboarding/*`)
- **Purpose:** Configuração de perfil, serviços e disponibilidade no app.
- **Inputs:** formulários de perfil/serviços/disponibilidade; `PhoneInput`.
- **Outputs:** perfil e agenda configurados via backend.
- **Key data structures:** `ServiceItem`, `AvailabilityRule`, navegação `OnboardingNavigator`.
- **Dependencies:** Backend v1, `src/services/api.ts`.
- **Edge cases:** validação de telefone BR, estados de loading/empty, erros de API tratados.

### 4.13 Mobile — Schedule (Agenda)

- **Name:** `mobile-schedule` (`app/schedule.tsx`, `src/hooks/useScheduleMetrics.ts`, `src/styles/schedule.styles.ts`)
- **Purpose:** Agenda principal do profissional: visualizar agendamentos do dia, navegar entre dias (prev/next), métricas.
- **Inputs:** `professionalId`, data selecionada; lista de appointments do backend.
- **Outputs:** lista de agendamentos com PII (apenas para o dono), métricas do dia.
- **Key data structures:** `Appointment`, `BlockedSlot`, métricas de `useScheduleMetrics`.
- **Dependencies:** `GET /v1/professionals/:id/appointments`, `available-days`, `blocked-slots`.
- **Edge cases:** dia sem agendamentos (empty state), fuso horário, paginação/limite, sessão expirada (401 global).

### 4.14 Mobile — Push Notifications

- **Name:** `mobile-push` (`src/services/notifications.ts`, `routes/v1/professionals/update-push-token.ts`)
- **Purpose:** Registrar Expo push token e receber notificações de novos agendamentos.
- **Inputs:** permissão do dispositivo, `expoConfig.extra.eas.projectId`.
- **Outputs:** push token registrado no backend (`PUT /v1/professionals/:id/push-token`); notificações recebidas.
- **Key data structures:** Expo push token, canal Android `agendamentos`.
- **Dependencies:** `expo-notifications` (import dinâmico), `expo-device`, backend.
- **Edge cases:** Expo Go (ignora push), emulador (`Device.isDevice === false`), permissão negada, `projectId` ausente, token inválido (limpeza — P2).

---

## 5. Workflow (fluxo principal)

### 5.1 Profissional — setup

1. Signup (web/mobile) → cria registro em `professionals` vinculado ao `auth_user_id`.
2. Configura perfil (`slug`, timezone, intervalo de slot, aviso mínimo).
3. Cadastra serviços (nome, duração, preço opcional).
4. Define disponibilidade semanal (janelas por dia, ex.: manhã + tarde).
5. (Mobile) registra push token.

### 5.2 Cliente — booking público

1. Acessa `/p/:slug` → backend retorna `PublicProfessional` + `PublicService[]`.
2. Escolhe serviço → backend calcula horários disponíveis (`calculateAvailability` considerando working intervals − appointments − blocked slots − buffer).
3. Escolhe data/hora → preenche `client_name` + `client_phone`.
4. Confirma → `POST /v1/public/appointments` (rate-limited) → RPC atômica `create_appointment_v1`:
   - valida serviço/ownership, cria/reusa cliente `(professional_id, phone)`, grava snapshots, aplica constraint GiST de overlap.
5. Sucesso → trigger insere `notifications` (pending) → `NOTIFY new_notification`.

### 5.3 Notificação assíncrona

1. Worker recebe `notification id` via `LISTEN`.
2. Faz claim atômico (`status pending → processing`).
3. Monta mensagem por `template_key` e envia WhatsApp.
4. Marca `sent`; em falha marca `failed` + `failure_reason`. Stale `processing` re-enfileirados a cada 5 min.

### 5.4 Profissional — operação

- Vê agenda no mobile (`schedule`), navega entre dias, recebe push.
- Pode cancelar / reagendar / marcar status (`completed`, `no_show`) — sempre com ownership e disparo de notificação.

---

## 6. Testing / Validation

### 6.1 Backend (Vitest)

| Camada | Arquivos | Cobertura esperada |
|--------|----------|--------------------|
| **Unit** | `tests/unit/*` (calculate-availability, can-book-slot, dtos, phone-validator, schemas) | lógica de slots, DTOs sem PII, validação Zod, telefone BR |
| **Domain** | `tests/domain/*` (booking-conflict, smart-slots, smart-slots-edge-cases) | overlap, buffers, janelas múltiplas, granularidade |
| **Concurrency** | `tests/concurrency/race-condition.test.ts` | criação simultânea no mesmo slot (atomicidade RPC) |
| **Integration** | `tests/integration/*` (appointments-http, availability-http, services-http, profile-http, guest-booking-flow, public-profile, worker-templates) | contratos HTTP fim-a-fim |
| **Security** | `tests/security/*` + `tests/integration-server/*` (auth-injection, auth-isolation, ownership, reschedule-security, auth-gauntlet) | bypass de auth, isolamento entre profissionais, ownership |

Casos prioritários (CLAUDE.md): overlap simultâneo, horário fora da disponibilidade, horário bloqueado, serviço inativo, profissional inexistente, reagendamento para horário ocupado, cancelamento de agendamento alheio, listagem sem vazamento de PII, phone inválido, slug inexistente.

### 6.2 Web

- Smoke E2E do fluxo público de booking (`/p/:slug`) — scripts `e2e-booking-*.mjs` na raiz (a consolidar em `web/`).
- Validação visual das etapas (service → datetime → client → confirm → success).
- Validar redirect/remoção da rota legada `/booking/:slug`.

### 6.3 Mobile

- `npx tsc --noEmit` + `jest --runInBand` (`apps/mobile/__tests__/**`).
- Fluxos críticos: login, signup, logout (limpeza de estado), hidratação de sessão, push token, agenda, navegação entre dias.
- Verificar: token não persistido indevidamente, erros de API tratados, sem URLs hardcoded, loading/empty states.

### 6.4 Comandos de verificação

```bash
# Backend
cd backend && npm ci && npm run build && npm test -- --run

# Web
cd web && npm ci && npm run build

# Mobile
cd apps/mobile && npm ci && npx tsc --noEmit && npm test -- --runInBand
```

---

## 7. Riscos / Débito técnico conhecido

- **Rota duplicada de booking** (`/p/:slug` vs `/booking/:slug`) — consolidar para uma única implementação (P1).
- **Artefatos de teste na raiz** (`booking-*.png`, `e2e-booking-*.mjs`, `run-*.png`) — mover para `web/` ou limpar (P1).
- **Worker WhatsApp** — depende de credenciais externas; templates não cobertos caem em simulação/log.
- **Push token inválido** — falta retry/limpeza (P2).
- **Segurança** — política rígida de secrets (apenas via env / painel do deploy); nunca versionar `.env`, `supa-*.txt`.

---

## 8. Referências internas

- `docs/modelagem_inicial_banco.md` — modelo de dados completo e constraints.
- `docs/api_v1.md` — contrato da API.
- `docs/architecture.md` — decisões de arquitetura (snapshots §7.4).
- `CLAUDE.md` — políticas de segurança, git e áreas críticas.
