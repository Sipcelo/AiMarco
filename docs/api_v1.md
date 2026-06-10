# AiMarco - api_v1.md

---

## 🇺🇸 English Version

## Overview

Base URL (production): https://aimarco.up.railway.app

All responses are JSON. All timestamps are ISO 8601 with timezone.
Business timezone: America/Sao_Paulo (UTC-3).

---

## Error format
```json
{ "error": "Human readable message in pt-BR" }
```

HTTP status codes used:
- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 409 Conflict
- 500 Internal Server Error

---

## Authentication

Protected endpoints require a valid JWT (JSON Web Token) from Supabase Auth.
Authentication is mandatory for all endpoints that access or modify professional-specific data.

### Authorization Header
```http
Authorization: Bearer <JWT_TOKEN>
```

### Authentication Errors
- **401 Unauthorized**: Missing, invalid, or expired token.
- **403 Forbidden**: Token is valid, but the authenticated user does not have permission to access the requested resource (Ownership check failed).

---

## Endpoints

### GET /health

Health check.

Response 200:
```json
{ "status": "ok" }
```

---

### GET /v1/availability/:professional_id

Returns available time slots for a professional on a given date.

Query params:
- service_id (required) — UUID of the service
- date (required) — YYYY-MM-DD

Response 200:
```json
{
  "date": "2026-04-02",
  "slots": ["09:00", "09:30", "10:00", "10:30"]
}
```

Notes:
- Slots are 30-minute intervals based on service duration
- Blocked slots and confirmed appointments are excluded
- Minimum booking notice: 30 minutes from now

---

### GET /v1/professionals/:id/available-days

Returns the next N available days for a professional based on their availability_rules.

Query params:
- count (optional, default 14) — number of days to return

Response 200:
```json
{
  "days": ["2026-03-24", "2026-03-25", "2026-03-26"]
}
```

---

### GET /v1/professionals/:id/appointments

Returns confirmed and past appointments for a professional on a given date.

**Authentication Required.** Returns DTO with client data for professional dashboard.

Query params:
- date (required) — YYYY-MM-DD

Response 200:
```json
[
  {
    "id": "uuid",
    "professional_id": "uuid",
    "service_id": "uuid",
    "client_id": "uuid",
    "scheduled_at": "2026-03-24T09:00:00-03:00",
    "status": "confirmed",
    "service_name": "Massagem Relaxante",
    "service_duration_minutes": 60,
    "client_name": "João Silva",
    "client_phone": "+5511999999999"
  }
]
```

Status values: confirmed, cancelled, completed, no_show

**Note:** All timestamps are ISO 8601 with timezone. Snapshot fields (`service_name`, `client_name`, `client_phone`) are denormalized for display.

---

### GET /v1/professionals/:id/blocked-slots

Returns blocked slots for a professional on a given date.

Query params:
- date (required) — YYYY-MM-DD

Response 200:
```json
[
  {
    "id": "uuid",
    "starts_at": "2026-03-24T14:00:00-03:00",
    "ends_at": "2026-03-24T16:00:00-03:00",
    "reason": "Reunião"
  }
]
```

---

### POST /v1/appointments

Creates a new appointment (guest booking, no auth required).

Request body:
```json
{
  "professional_id": "uuid",
  "service_id": "uuid",
  "scheduled_at": "2026-03-24T09:00:00-03:00",
  "client_name": "João Silva",
  "client_phone": "11999999999"
}
```

Response 201 (DTO for professional dashboard — includes snapshots):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T12:00:00+00:00",
  "status": "confirmed",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999"
}
```

Error 409: slot already taken or overlaps with blocked slot.

Notes:
- Client is identified by (professional_id, phone) — upserted on each booking
- Concurrency protected via PostgreSQL advisory lock per professional
- Slot validation runs inside atomic RPC (`create_appointment_v2`)
- `create_appointment_v2` validates `availability_rules`, saves all 5 snapshot fields, and handles exclusion violations gracefully
- Response uses DTO to ensure snapshot integrity and data sanitization

---

### POST /v1/appointments/:id/cancel

Cancels a confirmed appointment.

**Authentication Required.**

No request body required.

Response 200 (DTO with full appointment data):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T12:00:00+00:00",
  "status": "cancelled",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999"
}
```

Error 409: appointment is not in confirmed status.

---

### POST /v1/appointments/:id/reschedule

Reschedules an appointment to a new time.

**Authentication Required.**

Request body:
```json
{ "new_scheduled_at": "2026-03-24T14:00:00-03:00" }
```

Response 200 (DTO with full appointment data):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T17:00:00+00:00",
  "status": "confirmed",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999",
  "old_appointment_id": "uuid"
}
```

Error 409: slot already taken or overlaps with blocked slot.

Notes:
- This is internally handled as cancel + create (preserving the lineage)
- The original appointment is cancelled and a new one is created
- The 'id' returned is the NEW appointment ID
- 'old_appointment_id' links to the original one
- Response uses DTO to ensure snapshot integrity

---

### POST /v1/appointments/:id/status

Updates appointment status (professional action).

**Authentication Required.**

Request body:
```json
{ "status": "completed" }
```

Allowed transitions:
- confirmed → completed
- confirmed → no_show

Response 200 (DTO with full appointment data):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T12:00:00+00:00",
  "status": "completed",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999"
}
```

---

### POST /v1/professionals/:id/blocked-slots

Creates a blocked slot for a professional.

Request body:
```json
{
  "starts_at": "2026-03-25T14:00:00-03:00",
  "ends_at": "2026-03-25T16:00:00-03:00",
  "reason": "Reunião"
}
```

Response 201:
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "starts_at": "2026-03-25T17:00:00+00:00",
  "ends_at": "2026-03-25T19:00:00+00:00",
  "reason": "Reunião",
  "created_at": "2026-03-23T00:33:18+00:00",
  "warnings": "Atenção: 1 agendamento(s) confirmado(s) neste período. Verifique e cancele manualmente se necessário."
}
```

Error 409: overlaps with existing blocked slot.

Notes:
- warnings field is null when no confirmed appointments conflict
- Does not automatically cancel conflicting appointments

---

## Database RPC Contracts

These PostgreSQL functions are the authoritative source of business logic. The Node.js backend delegates to these RPCs rather than implementing rules in application code.

---

### RPC: `generate_slug(display_name TEXT) RETURNS TEXT`

**Source:** `backend/supabase/migrations/20260323000002_add_slug_to_professionals.sql`
**Purpose:** Convert a display name into a unique URL-safe slug for the professional's public booking page.
**Security:** Invoker rights (no SECURITY DEFINER). Called during onboarding and profile updates.

**Parameters:**
| Name | Type | Description |
|---|---|---|
| display_name | TEXT | Human-readable name (e.g., "Barbearia do João") |

**Returns:**
`TEXT` — URL-safe slug (e.g., `"barbearia-do-joao"`)

**Behavior:**
1. Lowercase the name
2. Replace one-or-more whitespace with `-`
3. Strip any character not matching `[a-z0-9-]`
4. If the resulting slug already exists in `professionals`, append `-1`, `-2`, … until unique
5. Return the unique slug

**Edge cases:**
- Does NOT strip accents (e.g., `João` → `joo`). Characters outside `[a-z0-9-]` are removed, so diacritics are dropped by step 3.
- Backfills `NULL` slugs using `COALESCE(display_name, full_name, 'professional')` on migration run.

**Note:** This is a general-purpose utility function, not a trigger. Callers must explicitly assign the result to `professionals.slug`.

**Examples:**
```
generate_slug('Barbearia do João.') → 'barbearia-do-joo'
generate_slug('Maria  Silva')       → 'maria-silva'
generate_slug('João')               → 'joao'  (if already taken: 'joao-1')
```

---

### RPC: `get_available_slots_v1(p_professional_id, p_service_id, p_date) RETURNS TABLE (available_time TEXT)`

**Source:** `backend/supabase/migrations/20260324175700_smart_slots_availability.sql`
**Purpose:** Calculate valid bookable time slots for a given date by subtracting occupied windows from the full day range.
**Security:** Invoker rights. Called by `GET /v1/availability/:professional_id`.

**Parameters:**
| Name | Type | Description |
|---|---|---|
| p_professional_id | UUID | Professional whose schedule to check |
| p_service_id | UUID | Service whose duration determines slot size |
| p_date | DATE | Target date (YYYY-MM-DD) |

**Returns:**
`TABLE (available_time TEXT)` — Array of `HH:MM` strings, ordered chronologically. Empty result set if professional/service not found.

**Behavior:**
1. Fetch `opening_time` and `closing_time` from `professionals` for the given professional
2. Fetch `duration_minutes` from `services`
3. Define the day range: `[p_date opening_time, p_date closing_time]` as `timestamptz`
4. Generate potential slots using `generate_series` with **15-minute intervals** (visual grid)
5. Build `busy_ranges` CTE: union of `blocked_slots.time_range` + `tstzrange` from confirmed/completed appointments
6. Filter out any potential slot whose `[slot_start, slot_start + duration)` overlaps with any busy range
7. Apply minimum booking notice: exclude `slot_start <= NOW() + 30 minutes`
8. Return remaining `slot_start` formatted as `HH:MM` in `America/Sao_Paulo` timezone

**Important discrepancy:** This RPC uses `professionals.opening_time`/`closing_time` (global day bounds), NOT `availability_rules` (per-day-of-week rules). The newer `create_appointment_v1` validates against `availability_rules`. The two validations may disagree if a professional has different rules for different days of the week. **Fixed in `get_available_slots_v2`** (see below).

---

### RPC: `create_public_appointment_v1(p_professional_id, p_service_id, p_scheduled_start, p_client_name, p_client_phone) RETURNS JSONB`

**Source:** `backend/supabase/migrations/20260323000005_create_public_appointment_rpc.sql`
**Purpose:** Atomic guest booking — finds/creates client and inserts appointment with snapshots in one transaction.
**Security:** `SECURITY DEFINER` — runs with elevated privileges for accessing shared schema tables.

**Parameters:**
| Name | Type | Description |
|---|---|---|
| p_professional_id | UUID | Target professional |
| p_service_id | UUID | Service being booked |
| p_scheduled_start | TIMESTAMPTZ | Absolute start time (with timezone) |
| p_client_name | TEXT | Client's full name |
| p_client_phone | TEXT | Client's phone number |

**Returns:**
`JSONB` — Object with `{id, client_id, scheduled_start, scheduled_end, status}` on success.

**Errors:**
- `EXCEPTION 'Service not found or is inactive'` — service doesn't exist, doesn't belong to professional, or is inactive
- `23P01` (exclusion_violation) — slot overlaps with an existing confirmed appointment or blocked slot. The DB constraint aborts the transaction.

**Behavior:**
1. Validate service exists, belongs to professional, is active. Get `duration_minutes`, `price_cents`, `name`
2. Compute `scheduled_end = scheduled_start + duration_minutes`
3. **Client upsert:** Insert into `clients` with `(professional_id, phone)` conflict target; on conflict, update `full_name`
4. **Insert appointment** with full snapshot fields:
   - `client_name_snapshot`, `client_phone_snapshot`
   - `service_name_snapshot`, `service_duration_snapshot_minutes`
   - `price_snapshot_cents`
5. Rely on GiST exclusion constraint `appointments_overlap_exclude` (partial, `WHERE status = 'confirmed'`) for concurrency safety
6. Return appointment summary as JSONB

**Note:** This is the legacy version. Does NOT validate against `availability_rules`. Use `create_appointment_v1` for full validation.

---

### RPC: `create_appointment_v1(p_professional_id, p_service_id, p_scheduled_at, p_client_name, p_client_phone) RETURNS JSON`

**Source:** `backend/supabase/migrations/20260529000001_fix_appointment_trigger_column.sql` (versão vigente; buffer zerado em `20260601000002`)
**Purpose:** Versioned replacement for `create_public_appointment_v1` with `availability_rules` validation.
**Security:** Invoker rights. Called by `POST /v1/appointments`.

**Parameters:**
| Name | Type | Description |
|---|---|---|
| p_professional_id | UUID | Target professional |
| p_service_id | UUID | Service being booked |
| p_scheduled_at | TIMESTAMPTZ | Absolute start time (with timezone) |
| p_client_name | TEXT | Client's full name |
| p_client_phone | TEXT | Client's phone number |

**Returns:**
`JSON` — Appointment record as JSON (via `row_to_json`), or JSON error object.

**Errors returned as JSON (not exceptions):**
- `{'error': 'Service not found or does not belong to the professional.'}`
- `{'error': 'Selected slot is no longer available.'}` — no matching availability_rule covers the full requested window
- `{'error': 'Horário indisponível (DB Constraint)'}` — exclusion_violation from GiST constraint

**Behavior:**
1. Lookup service `duration_minutes` where service belongs to professional and is active
2. Compute `ends_at = scheduled_at + duration`
3. Convert to local wall-clock time in `America/Sao_Paulo`
4. **Validate against `availability_rules`:** Check that an active rule for `day_of_week` covers `[requested_time, requested_end_time]`, ensuring no local day crossover
5. **Client upsert:** Same as `create_public_appointment_v1` — insert with `ON CONFLICT (professional_id, phone)`
6. **Insert appointment** with status `'confirmed'`. Does NOT include snapshot fields (unlike the public version — see discrepancy below)
7. Wrap insert in `BEGIN ... EXCEPTION WHEN exclusion_violation` to catch DB constraint errors gracefully

**Discrepancies vs `create_public_appointment_v1`:**
- This RPC does NOT set snapshot fields (no `client_name_snapshot`, `service_name_snapshot`, etc.)
- Error handling is graceful (returns JSON error), not exception-raising
- Validates against `availability_rules` (day-of-week specific) vs none
**All discrepancies resolved in `create_appointment_v2`** (see below).

---

### RPC: `reschedule_appointment_v1(p_old_appointment_id, p_new_scheduled_at) RETURNS JSON`

**Source:** `backend/supabase/migrations/20260601000001_reschedule_appointment_rpc.sql`
**Purpose:** Atomically cancel an existing appointment and create a new one at a different time, preserving lineage.
**Security:** Invoker rights. Called by `POST /v1/appointments/:id/reschedule`.

**Parameters:**
| Name | Type | Description |
|---|---|---|
| p_old_appointment_id | UUID | ID of the appointment to reschedule |
| p_new_scheduled_at | TIMESTAMPTZ | New absolute start time |

**Returns:**
`JSON` — New appointment record as JSON, or JSON error object.

**Errors:**
- `{'error': 'Agendamento não encontrado ou não pode ser reagendado.'}` — old appointment not found or not confirmed
- `{'error': 'Novo horário não disponível na agenda.'}` — no availability_rule covers the new window
- `{'error': 'Horário indisponível (DB Constraint)'}` — exclusion_violation

**Behavior:**
1. Fetch old appointment (must be `'confirmed'`)
2. Get service duration from existing appointment's service
3. Compute new end time
4. Validate new window against `availability_rules` (same logic as `create_appointment_v1`)
5. **Cancel old:** `UPDATE appointments SET status = 'cancelled' WHERE id = p_old_appointment_id`
6. **Insert new** with `rescheduled_from_appointment_id = p_old_appointment_id` for lineage
7. Wrap insert in `BEGIN ... EXCEPTION WHEN exclusion_violation` to catch constraint errors

---

> ⚠️ **As RPCs `_v2` abaixo NUNCA foram implementadas.** A migration `20260402180000_contract_v2.sql` não existe no repositório e o backend não as chama (o código usa apenas as `_v1`). A premissa do "contrato v2" (adicionar snapshots ausentes nas v1) também está obsoleta: as `_v1` passaram a gravar snapshots nas migrations `20260325000001_add_snapshots_to_appointments.sql` e `20260529000001_fix_appointment_trigger_column.sql`, e o buffer foi zerado em `20260601000002`. **O contrato oficial e congelado do piloto é o conjunto `_v1`.** As seções v2 ficam abaixo apenas como registro histórico de design.

### RPC: `get_available_slots_v2(p_professional_id, p_service_id, p_date) RETURNS TABLE (available_time TEXT)` _(NÃO IMPLEMENTADA)_

**Source:** `backend/supabase/migrations/20260402180000_contract_v2.sql` _(arquivo inexistente)_
**Purpose:** Canonical contract for availability calculation — uses `availability_rules` as single source of truth.
**Security:** Invoker rights. Called by `GET /v1/availability/:professional_id` and `GET /v1/public/professional/:id/availability`.

**Parameters:** Same as v1.

**Returns:** Same as v1.

**Behavior:**
1. Fetch `duration_minutes` from `services`
2. Derive `day_of_week` for `p_date` in `America/Sao_Paulo` timezone
3. Query `availability_rules` for matching `professional_id` + `day_of_week` (supports multiple intervals per day, e.g., morning + afternoon)
4. For each rule interval, generate potential slots using `generate_series` with **15-minute intervals**
5. Build `busy_ranges` CTE: union of `blocked_slots` + confirmed/completed appointments
6. Filter out overlapping slots
7. Apply minimum booking notice: exclude `slot_start <= NOW() + 30 minutes`
8. Return remaining `slot_start` formatted as `HH:MM`

**Key change from v1:** replaces `professionals.opening_time/closing_time` with `availability_rules` as the source of truth for working hours.

---

### RPC: `create_appointment_v2(p_professional_id, p_service_id, p_scheduled_at, p_client_name, p_client_phone) RETURNS JSON`

**Source:** `backend/supabase/migrations/20260402180000_contract_v2.sql`
**Purpose:** Canonical booking contract — validates availability_rules AND saves complete snapshots.
**Security:** Invoker rights. Called by `POST /v1/appointments` and `POST /v1/public/appointments`.

**Parameters:** Same as v1.

**Returns:** `JSON` — Full appointment record including all snapshot fields.

**Behavior:** Same as v1 validation (advisory lock, availability_rules, blocked_slots, appointment overlap check) PLUS:
- Fetches `name`, `price_cents` in addition to `duration_minutes` from service
- **INSERT includes ALL 5 snapshot fields:** `service_name`, `service_duration_minutes`, `price_snapshot_cents`, `client_name`, `client_phone`
- Returns full appointment record with snapshots

**Discrepancy resolved:** v1 did NOT save snapshots. v2 saves all mandatory snapshots per architecture requirement (section 7.4).

---

### RPC: `create_public_appointment_v2(...same params...) RETURNS JSONB`

**Source:** `backend/supabase/migrations/20260402180000_contract_v2.sql`
**Purpose:** Canonical public booking contract — validates availability_rules AND saves complete snapshots.
**Security:** `SECURITY DEFINER`

**Discrepancy resolved:** v1 did NOT validate `availability_rules`. v2 validates the same availability_rules as create_appointment_v2, ensuring public booking cannot create appointments outside working hours.

---

### RPC: `reschedule_appointment_v2(p_old_appointment_id, p_new_scheduled_at) RETURNS JSON`

**Source:** `backend/supabase/migrations/20260402180000_contract_v2.sql`
**Purpose:** Canonical reschedule contract — preserves lineage AND snapshots with COALESCE fallback for legacy.
**Security:** Invoker rights. Called by `POST /v1/appointments/:id/reschedule`.

**Behavior:** Same as v1 cancel+create pattern PLUS:
- Fetches current service and client data for COALESCE fallback
- **Snapshots:** `COALESCE(old.snapshot, current_data)` — legacy appointments without snapshots get current service/client values
- Returns new appointment with all snapshot fields

**Discrepancy resolved:** v1 did NOT save snapshots. v2 preserves snapshots (or derives from current data for legacy appointments).

---

### Exclusion Constraints (Concurrency Safety)

**Source:** `backend/supabase/migrations/20260323000006_exclusion_constraints.sql`

These GiST constraints enforce "no overlapping time for the same professional" at the database layer.

#### `appointments_overlap_exclude`

```sql
ALTER TABLE appointments
ADD CONSTRAINT appointments_overlap_exclude
EXCLUDE USING gist (
  professional_id WITH =,
  tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
)
WHERE (status = 'confirmed');
```

- Prevents two confirmed appointments for the same professional from overlapping in time
- Partial index: only applies where `status = 'confirmed'` (cancelled/completed/no_show don't block)
- Enforced at INSERT/UPDATE time — raising `23P01` (exclusion_violation)

#### `blocked_slots_overlap_exclude`

```sql
ALTER TABLE blocked_slots
ADD CONSTRAINT blocked_slots_overlap_exclude
EXCLUDE USING gist (
  professional_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
);
```

- Prevents two blocked slots for the same professional from overlapping
- Full constraint (all rows)
- Enforced at INSERT/UPDATE time — raising `23P01`

#### `availability_rules_overlap_exclude`

**Source:** `backend/supabase/migrations/20260323000003_availability_rules_overlap_exclude.sql`

```sql
ALTER TABLE availability_rules
ADD CONSTRAINT availability_rules_overlap_exclude
EXCLUDE USING gist (
  professional_id WITH =,
  day_of_week WITH =,
  timerange(start_time, end_time, '[)') WITH &&
);
```

- Prevents two availability rules for the same professional on the same day of week from overlapping
- Uses a custom `timerange` type (range over `time`) defined in the same migration

---

## Not implemented in V1

- Professional registration/onboarding endpoints — pending
- Service management endpoints — pending
- Availability rules management endpoints — pending
- Notification endpoints — pending

---

## 🇧🇷 Versão em Português

## Visão Geral

URL base (produção): https://aimarco.up.railway.app

Todas as respostas são JSON. Todos os timestamps são ISO 8601 com timezone.
Fuso horário do negócio: America/Sao_Paulo (UTC-3).

---

## Formato de Erro

```json
{ "error": "Mensagem legível em português" }
```

Códigos de status HTTP utilizados:
- 200 OK
- 201 Criado
- 400 Requisição Inválida
- 401 Não Autorizado
- 403 Proibido
- 409 Conflito
- 500 Erro Interno do Servidor

---

## Autenticação

Endpoints protegidos exigem um JWT (JSON Web Token) válido do Supabase Auth.
A autenticação é obrigatória para todos os endpoints que acessam ou modificam dados específicos de profissionais.

### Header de Autorização

```http
Authorization: Bearer <JWT_TOKEN>
```

### Erros de Autenticação
- **401 Não Autorizado**: Token ausente, inválido ou expirado.
- **403 Proibido**: Token é válido, mas o usuário autenticado não tem permissão para acessar o recurso solicitado (Falha na verificação de propriedade).

---

## Endpoints

### GET /health

Verificação de saúde do serviço.

Resposta 200:
```json
{ "status": "ok" }
```

---

### GET /v1/availability/:professional_id

Retorna horários disponíveis para um profissional em uma data específica.

Parâmetros de consulta:
- service_id (obrigatório) — UUID do serviço
- date (obrigatório) — YYYY-MM-DD

Resposta 200:
```json
{
  "date": "2026-04-02",
  "slots": ["09:00", "09:30", "10:00", "10:30"]
}
```

Notas:
- Slots são intervalos de 30 minutos baseados na duração do serviço
- Horários bloqueados e agendamentos confirmados são excluídos
- Pré-aviso mínimo para agendamento: 30 minutos a partir de agora

---

### GET /v1/professionals/:id/available-days

Retorna os próximos N dias disponíveis para um profissional com base nas availability_rules.

Parâmetros de consulta:
- count (opcional, padrão 14) — número de dias a retornar

Resposta 200:
```json
{
  "days": ["2026-03-24", "2026-03-25", "2026-03-26"]
}
```

---

### Availability Rules (Protected)

#### GET /v1/professionals/:id/availability

List all availability rules for a professional.

**Authentication Required.**

Response 200:
```json
[
  {
    "id": "uuid",
    "day_of_week": 1,
    "start_time": "09:00",
    "end_time": "12:00",
    "is_active": true
  }
]
```

---

#### POST /v1/professionals/:id/availability

Create or batch update availability rules.

**Authentication Required.**

**Purpose:** Support complex schedules (e.g., morning + afternoon with lunch break). Accepts an array of rule objects.

Request body (single or array):
```json
[
  {
    "day_of_week": 1,
    "start_time": "09:00",
    "end_time": "12:00"
  },
  {
    "day_of_week": 1,
    "start_time": "14:00",
    "end_time": "18:00"
  }
]
```

Validation:
- `day_of_week`: 0 (Sunday) to 6 (Saturday)
- `start_time` / `end_time`: HH:mm (24h format)
- Must satisfy `start_time < end_time`
- Batch internal overlap check: rules on same day must not overlap

Response 201 (created) or 200 (updated):
```json
[
  {
    "id": "uuid",
    "day_of_week": 1,
    "start_time": "09:00",
    "end_time": "12:00",
    "is_active": true
  }
]
```

Errors:
- 409 Conflict: overlaps with existing rules or within batch

---

#### PUT /v1/professionals/:id/availability-rules/:rid

Update a single availability rule.

**Authentication Required.**

Request body:
```json
{
  "day_of_week": 1,
  "start_time": "09:00",
  "end_time": "12:00",
  "is_active": true
}
```

Response 200:
```json
{
  "id": "uuid",
  "day_of_week": 1,
  "start_time": "09:00",
  "end_time": "12:00",
  "is_active": true
}
```

Errors:
- 409 Conflict: overlaps with another active rule on same day

---

#### DELETE /v1/professionals/:id/availability-rules/:rid

Logical delete (deactivate) an availability rule.

**Authentication Required.**

Response 200:
```json
{
  "message": "Regra desativada com sucesso."
}
```

Note: Never physically deletes; sets `is_active = false`. Idempotent.

---

### GET /v1/professionals/:id/appointments

Retorna agendamentos confirmados e passados para um profissional em uma data específica.

**Autenticação Requerida.** Retorna DTO com dados do cliente para o dashboard do profissional.

Parâmetros de consulta:
- date (obrigatório) — YYYY-MM-DD

Resposta 200:
```json
[
  {
    "id": "uuid",
    "professional_id": "uuid",
    "service_id": "uuid",
    "client_id": "uuid",
    "scheduled_at": "2026-03-24T09:00:00-03:00",
    "status": "confirmed",
    "service_name": "Massagem Relaxante",
    "service_duration_minutes": 60,
    "client_name": "João Silva",
    "client_phone": "+5511999999999"
  }
]
```

Valores de status: confirmed, cancelled, completed, no_show

**Nota:** Todos os timestamps são ISO 8601 com timezone. Campos snapshot (`service_name`, `client_name`, `client_phone`) são denormalizados para exibição.

---

### GET /v1/professionals/:id/blocked-slots

Retorna horários bloqueados para um profissional em uma data específica.

Parâmetros de consulta:
- date (obrigatório) — YYYY-MM-DD

Resposta 200:
```json
[
  {
    "id": "uuid",
    "starts_at": "2026-03-24T14:00:00-03:00",
    "ends_at": "2026-03-24T16:00:00-03:00",
    "reason": "Reunião"
  }
]
```

---

### POST /v1/appointments

Cria um novo agendamento (booking de convidado, sem autenticação).

Corpo da requisição:
```json
{
  "professional_id": "uuid",
  "service_id": "uuid",
  "scheduled_at": "2026-03-24T09:00:00-03:00",
  "client_name": "João Silva",
  "client_phone": "11999999999"
}
```

Resposta 201 (DTO para dashboard profissional — inclui snapshots):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T12:00:00+00:00",
  "status": "confirmed",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999"
}
```

Erro 409: slot já ocupado ou conflita com horário bloqueado.

Notas:
- Cliente é identificado por (professional_id, phone) — upsert a cada booking
- Concorrência protegida via advisory lock PostgreSQL por profissional
- Validação de slot executa dentro de RPC atômica (`create_appointment_v2`) com validação de availability_rules + snapshots completos
- Resposta usa DTO para garantir integridade de snapshot e sanitização de dados

---

### POST /v1/appointments/:id/cancel

Cancela um agendamento confirmado.

**Autenticação Requerida.**

Sem corpo de requisição.

Resposta 200 (DTO com dados completos do agendamento):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T12:00:00+00:00",
  "status": "cancelled",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999"
}
```

Erro 409: agendamento não está em status confirmed.

---

### POST /v1/appointments/:id/reschedule

Reagenda um agendamento para um novo horário.

**Autenticação Requerida.**

Corpo da requisição:
```json
{ "new_scheduled_at": "2026-03-24T14:00:00-03:00" }
```

Resposta 200 (DTO com dados completos do agendamento):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T17:00:00+00:00",
  "status": "confirmed",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999",
  "old_appointment_id": "uuid"
}
```

Erro 409: slot já ocupado ou conflita com horário bloqueado.

Notas:
- Internamente tratado como cancel + create (preservando o vínculo)
- O agendamento original é cancelado e um novo é criado
- O 'id' retornado é o NOVO ID do agendamento
- 'old_appointment_id' vincula ao original
- Resposta usa DTO para garantir integridade de snapshot

---

### POST /v1/appointments/:id/status

Atualiza o status de um agendamento (ação do profissional).

**Autenticação Requerida.**

Corpo da requisição:
```json
{ "status": "completed" }
```

Transições permitidas:
- confirmed → completed
- confirmed → no_show

Resposta 200 (DTO com dados completos do agendamento):
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "2026-03-24T12:00:00+00:00",
  "status": "completed",
  "service_name": "Massagem Relaxante",
  "service_duration_minutes": 60,
  "client_name": "João Silva",
  "client_phone": "+5511999999999"
}
```

---

### POST /v1/professionals/:id/blocked-slots

Cria um horário bloqueado para um profissional.

Corpo da requisição:
```json
{
  "starts_at": "2026-03-25T14:00:00-03:00",
  "ends_at": "2026-03-25T16:00:00-03:00",
  "reason": "Reunião"
}
```

Resposta 201:
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "starts_at": "2026-03-25T17:00:00+00:00",
  "ends_at": "2026-03-25T19:00:00+00:00",
  "reason": "Reunião",
  "created_at": "2026-03-23T00:33:18+00:00",
  "warnings": "Atenção: 1 agendamento(s) confirmado(s) neste período. Verifique e cancele manualmente se necessário."
}
```

Erro 409: conflita com horário bloqueado existente.

Notas:
- campo warnings é null quando não há agendamentos confirmados em conflito
- Não cancela automaticamente agendamentos conflitantes

---

## Não implementado no V1

- Endpoints de registro/onboarding de profissionais — pendente
- Endpoints de gestão de serviços — pendente
- Endpoints de gestão de regras de disponibilidade — pendente
- Endpoints de notificações — pendente

---

## Contratos de RPCs do Banco de Dados

Veja a seção "Database RPC Contracts" no topo deste documento para os contratos completos em inglês. Resumo das funções existentes:

| Função | Migration | Propósito |
|---|---|---|
| `generate_slug(TEXT)` | 20260323000002 | Gera slug URL única a partir de nome |
| `get_available_slots_v1(UUID, UUID, DATE)` | 20260324175700 | Legado — usa opening_time/closing_time |
| `get_available_slots_v2(UUID, UUID, DATE)` | 20260402180000 | Calcula slots via availability_rules (oficial) |
| `create_public_appointment_v1(...)` | 20260323000005 | Legado — não valida availability_rules |
| `create_public_appointment_v2(...)` | 20260402180000 | Booking público com availability_rules + snapshots |
| `create_appointment_v1(...)` | 20260402120000 | Bookings legados — sem snapshots |
| `create_appointment_v2(...)` | 20260402180000 | Booking privado oficial com snapshots completos |
| `reschedule_appointment_v1(UUID, TIMESTAMPTZ)` | 20260402120000 | Legado — sem snapshots |
| `reschedule_appointment_v2(UUID, TIMESTAMPTZ)` | 20260402180000 | Reagendamento oficial — lineage + COALESCE para legado |

**Constraints de exclusão (GiST):**
- `appointments_overlap_exclude` — impede agendamentos confirmados sobrepostos
- `blocked_slots_overlap_exclude` — impede horários bloqueados sobrepostos
- `availability_rules_overlap_exclude` — impede regras de disponibilidade sobrepostas no mesmo dia
