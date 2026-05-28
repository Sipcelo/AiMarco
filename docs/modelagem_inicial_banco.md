# AiMarco - modelagem_inicial_banco.md

## 1. Purpose

This document defines the initial database model for AiMarco V1.

Its goal is to support:
- one schedule per professional
- guest customer booking
- safe appointment creation
- blocked time slots
- weekly availability rules
- cancellation
- rescheduling
- appointment history integrity

The model must prioritize scheduling reliability over premature complexity.

## 2. V1 database assumptions

The database model assumes:

- one professional owns one schedule
- one professional can have many services
- one professional can have many clients
- customers do not need accounts in V1
- customers are identified primarily by phone number
- appointments are auto-confirmed
- rescheduling is handled as cancellation plus linked new appointment
- overlap prevention is a critical integrity rule
- service and client snapshots must be stored in appointments

## 3. Main tables

The initial V1 tables are:

- professionals
- clients
- services
- availability_rules
- blocked_slots
- appointments
- notifications

## 4. Table: professionals

Represents the owner of the schedule.

### Fields
- id
- full_name
- display_name
- phone
- email
- business_type
- avatar_url
- timezone
- slot_interval_minutes
- minimum_booking_notice_minutes
- minimum_cancel_notice_minutes
- minimum_reschedule_notice_minutes
- allow_client_cancellation
- allow_client_reschedule
- auto_confirm_appointments
- status
- created_at
- updated_at

### Notes
- `business_type` should be limited to the V1 niches:
  - barbershop
  - nails
  - hair
- `status` should support:
  - active
  - inactive
- `slot_interval_minutes` defaults to 15
- `minimum_booking_notice_minutes` defaults to 30
- `minimum_cancel_notice_minutes` defaults to 120
- `minimum_reschedule_notice_minutes` defaults to 120

## 5. Table: clients

Represents a customer linked to a professional.

### Fields
- id
- professional_id
- full_name
- phone
- email
- notes
- status
- created_at
- updated_at

### Notes
- customers are scoped by professional in V1
- the pair `(professional_id, phone)` should be unique
- `status` should support:
  - active
  - blocked

## 6. Table: services

Represents a bookable service.

### Fields
- id
- professional_id
- name
- description
- duration_minutes
- price_cents
- buffer_before_minutes
- buffer_after_minutes
- is_active
- created_at
- updated_at

### Notes
- `duration_minutes` must be greater than 0
- `buffer_before_minutes` defaults to 0
- `buffer_after_minutes` defaults to 0
- `price_cents` is optional in V1
- `(professional_id, name)` should be unique

## 7. Table: availability_rules

Represents recurring weekly working hours.

### Fields
- id
- professional_id
- day_of_week
- start_time
- end_time
- is_active
- created_at
- updated_at

### Notes
- `day_of_week` should use a fixed convention across the project
- recommended:
  - 0 = Sunday
  - 1 = Monday
  - ...
  - 6 = Saturday
- `start_time` must be earlier than `end_time`
- the same professional can have multiple ranges on the same day
- ranges on the same day must not overlap

## 8. Table: blocked_slots

Represents one-off unavailable time windows.

### Fields
- id
- professional_id
- starts_at
- ends_at
- reason
- block_type
- created_at
- updated_at

### Notes
- `starts_at` must be earlier than `ends_at`
- `block_type` should support:
  - manual
  - personal
  - time_off
- blocked slots for the same professional should not overlap

## 9. Table: appointments

Represents an actual booking.

### Fields
- id
- professional_id
- client_id
- service_id
- status
- scheduled_start
- scheduled_end
- service_name_snapshot
- service_duration_snapshot_minutes
- price_snapshot_cents
- client_name_snapshot
- client_phone_snapshot
- rescheduled_from_appointment_id
- cancellation_reason
- cancelled_by
- confirmed_at
- cancelled_at
- completed_at
- created_at
- updated_at

### Official V1 statuses
- confirmed
- cancelled
- completed
- no_show

### Notes
- `scheduled_start` must be earlier than `scheduled_end`
- `confirmed_at` should be set on creation
- `cancelled_by` should support:
  - client
  - professional
  - system
- snapshots are mandatory
- `rescheduled_from_appointment_id` links rescheduled appointments

## 10. Table: notifications

Represents notification records and future delivery tracking.

### Fields
- id
- appointment_id
- recipient_type
- channel
- template_key
- status
- scheduled_for
- sent_at
- failure_reason
- created_at

### Notes
- `recipient_type` should support:
  - client
  - professional
- `channel` should support:
  - in_app
  - push
  - sms
  - whatsapp
- `status` should support:
  - pending
  - sent
  - failed

## 11. Relationships

### professionals -> services
One professional has many services.

### professionals -> availability_rules
One professional has many weekly availability rules.

### professionals -> blocked_slots
One professional has many blocked slots.

### professionals -> clients
One professional has many clients.

### professionals -> appointments
One professional has many appointments.

### clients -> appointments
One client can have many appointments with the same professional.

### services -> appointments
One service can be used in many appointments.

### appointments -> notifications
One appointment can generate many notifications.

### appointments -> appointments
One appointment can reference a previous appointment through `rescheduled_from_appointment_id`.

## 12. Critical integrity rules

### 12.1 No overlapping active appointments
A professional must never have overlapping active appointments.

Active statuses for overlap prevention:
- confirmed
- completed
- no_show

Inactive for overlap prevention:
- cancelled

### 12.2 No overlapping blocked slots
Blocked slots for the same professional must not overlap.

### 12.3 No overlapping daily availability ranges
Availability ranges for the same professional and day must not overlap.

### 12.4 Snapshots are mandatory
Appointments must store:
- service name snapshot
- service duration snapshot
- optional service price snapshot
- client name snapshot
- client phone snapshot

### 12.5 Rescheduling must preserve history
Rescheduling must:
- cancel the original appointment
- create a new appointment
- preserve linkage

## 13. Recommended constraints

### professionals
- phone unique
- email unique when present
- status check constraint
- business_type check constraint
- positive notice values

### clients
- unique `(professional_id, phone)`
- status check constraint

### services
- unique `(professional_id, name)`
- duration greater than 0
- non-negative buffer fields
- non-negative optional price

### availability_rules
- valid day_of_week
- start_time < end_time

### blocked_slots
- starts_at < ends_at

### appointments
- scheduled_start < scheduled_end
- valid status
- valid cancelled_by
- cancelled appointments should have cancelled_at
- completed appointments should have completed_at

## 14. Recommended indexes

### professionals
- unique on phone
- unique on email when present
- index on status

### clients
- unique on `(professional_id, phone)`
- index on `(professional_id, full_name)`

### services
- unique on `(professional_id, name)`
- index on `(professional_id, is_active)`

### availability_rules
- index on `(professional_id, day_of_week, is_active)`

### blocked_slots
- index on `(professional_id, starts_at, ends_at)`

### appointments
- index on `(professional_id, scheduled_start)`
- index on `(professional_id, status, scheduled_start)`
- index on `(client_id, scheduled_start)`
- index on `rescheduled_from_appointment_id`

### notifications
- index on `(appointment_id)`
- index on `(status, scheduled_for)`
- index on `(channel, status)`

## 15. PostgreSQL implementation notes

### Overlap prevention
The system implements strong overlap prevention using PostgreSQL range-based exclusion constraints with GiST indexes.

Implemented constraints:
- `appointments`: `EXCLUDE USING gist (professional_id WITH =, tstzrange(scheduled_start, scheduled_end, '[)') WITH &&)` where `status = 'confirmed'`
- `blocked_slots`: `EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)`
- `availability_rules`: `EXCLUDE USING gist (professional_id WITH =, day_of_week WITH =, timerange(start_time, end_time, '[)') WITH &&)`

## 16. Future compatibility

This model should allow future evolution for:
- customer accounts
- multiple professionals
- payments
- marketplace
- additional niches
- richer notifications

These are not part of V1 and must not shape the database beyond reasonable preparation.

## 17. Practical modeling decisions frozen for V1

The following decisions are official for V1:
- clients are scoped by professional
- appointments must store snapshots
- availability_rules and blocked_slots are separate
- rescheduling creates a new appointment
- overlap prevention is a core data integrity concern
- no monetization is required in the initial schema beyond optional price fields

## 18. Next document dependency

This document directly supports:
- api_v1.md
- migration design
- backend folder structure
- domain test design
- implementation sequencing

---

## 🇧🇷 Versão em Português

# AiMarco - Modelagem Inicial do Banco de Dados

## 1. Propósito

Este documento define a modelagem inicial do banco de dados para o AiMarco V1.

Seu objetivo é suportar:
- uma agenda por profissional
- agendamento de clientes convidados (guest)
- criação segura de agendamentos
- horários bloqueados
- regras de disponibilidade semanal
- cancelamento
- reagendamento
- integridade do histórico de agendamentos

O modelo deve priorizar confiabilidade de agendamento em vez de complexidade prematura.

## 2. Premissas do banco de dados V1

O modelo de banco assume:

- um profissional possui uma agenda
- um profissional pode ter muitos serviços
- um profissional pode ter muitos clientes
- clientes não precisam de contas no V1
- clientes são identificados primariamente por telefone
- agendamentos são auto-confirmados
- reagendamento é tratado como cancelamento + novo agendamento vinculado
- prevenção de sobreposição é uma regra de integridade crítica
- snapshots de serviço e cliente devem ser armazenados nos agendamentos

## 3. Tabelas principais

As tabelas iniciais do V1 são:

- professionals
- clients
- services
- availability_rules
- blocked_slots
- appointments
- notifications

## 4. Tabela: professionals

Representa o dono da agenda.

### Campos
- id
- full_name
- display_name
- phone
- email
- business_type
- avatar_url
- timezone
- slot_interval_minutes
- minimum_booking_notice_minutes
- minimum_cancel_notice_minutes
- minimum_reschedule_notice_minutes
- allow_client_cancellation
- allow_client_reschedule
- auto_confirm_appointments
- status
- created_at
- updated_at

### Notas
- `business_type` deve ser limitado aos nichos V1:
  - barbershop
  - nails
  - hair
- `status` deve suportar:
  - active
  - inactive
- `slot_interval_minutes` padrão é 15
- `minimum_booking_notice_minutes` padrão é 30
- `minimum_cancel_notice_minutes` padrão é 120
- `minimum_reschedule_notice_minutes` padrão é 120

## 5. Tabela: clients

Representa um cliente vinculado a um profissional.

### Campos
- id
- professional_id
- full_name
- phone
- email
- notes
- status
- created_at
- updated_at

### Notas
- clientes são scopeados por profissional no V1
- o par `(professional_id, phone)` deve ser único
- `status` deve suportar:
  - active
  - blocked

## 6. Tabela: services

Representa um serviço que pode ser agendado.

### Campos
- id
- professional_id
- name
- description
- duration_minutes
- price_cents
- buffer_before_minutes
- buffer_after_minutes
- is_active
- created_at
- updated_at

### Notas
- `duration_minutes` deve ser maior que 0
- `buffer_before_minutes` padrão é 0
- `buffer_after_minutes` padrão é 0
- `price_cents` é opcional no V1
- `(professional_id, name)` deve ser único

## 7. Tabela: availability_rules

Representa horários de trabalho semanais recorrentes.

### Campos
- id
- professional_id
- day_of_week
- start_time
- end_time
- is_active
- created_at
- updated_at

### Notas
- `day_of_week` deve usar uma convenção fixa em todo o projeto
- recomendado:
  - 0 = Domingo
  - 1 = Segunda
  - ...
  - 6 = Sábado
- `start_time` deve ser anterior a `end_time`
- o mesmo profissional pode ter múltiplos ranges no mesmo dia
- ranges no mesmo dia não devem se sobrepor

## 8. Tabela: blocked_slots

Representa janelas de tempo indisponíveis pontuais.

### Campos
- id
- professional_id
- starts_at
- ends_at
- reason
- block_type
- created_at
- updated_at

### Notas
- `starts_at` deve ser anterior a `ends_at`
- `block_type` deve suportar:
  - manual
  - personal
  - time_off
- horários bloqueados do mesmo profissional não devem se sobrepor

## 9. Tabela: appointments

Representa um agendamento real.

### Campos
- id
- professional_id
- client_id
- service_id
- status
- scheduled_start
- scheduled_end
- service_name_snapshot
- service_duration_snapshot_minutes
- price_snapshot_cents
- client_name_snapshot
- client_phone_snapshot
- rescheduled_from_appointment_id
- cancellation_reason
- cancelled_by
- confirmed_at
- cancelled_at
- completed_at
- created_at
- updated_at

### Status oficiais do V1
- confirmed
- cancelled
- completed
- no_show

### Notas
- `scheduled_start` deve ser anterior a `scheduled_end`
- `confirmed_at` deve ser definido no creation
- `cancelled_by` deve suportar:
  - client
  - professional
  - system
- snapshots são obrigatórios
- `rescheduled_from_appointment_id` vincula agendamentos reagendados

## 10. Tabela: notifications

Representa registros de notificação e rastreamento de entrega futura.

### Campos
- id
- appointment_id
- recipient_type
- channel
- template_key
- status
- scheduled_for
- sent_at
- failure_reason
- created_at

### Notas
- `recipient_type` deve suportar:
  - client
  - professional
- `channel` deve suportar:
  - in_app
  - push
  - sms
  - whatsapp
- `status` deve suportar:
  - pending
  - sent
  - failed

## 11. Relacionamentos

### professionals -> services
Um profissional tem muitos serviços.

### professionals -> availability_rules
Um profissional tem muitas regras de disponibilidade semanal.

### professionals -> blocked_slots
Um profissional tem muitos horários bloqueados.

### professionals -> clients
Um profissional tem muitos clientes.

### professionals -> appointments
Um profissional tem muitos agendamentos.

### clients -> appointments
Um cliente pode ter muitos agendamentos com o mesmo profissional.

### services -> appointments
Um serviço pode ser usado em muitos agendamentos.

### appointments -> notifications
Um agendamento pode gerar muitas notificações.

### appointments -> appointments
Um agendamento pode referenciar um agendamento anterior através de `rescheduled_from_appointment_id`.

## 12. Regras críticas de integridade

### 12.1 Nenhum agendamento ativo sobreposto
Um profissional nunca deve ter agendamentos ativos sobrepostos.

Status ativos para prevenção de sobreposição:
- confirmed
- completed
- no_show

Inativos para prevenção de sobreposição:
- cancelled

### 12.2 Nenhum horário bloqueado sobreposto
Horários bloqueados do mesmo profissional não devem se sobrepor.

### 12.3 Nenhum range de disponibilidade diária sobreposto
Ranges de disponibilidade do mesmo profissional e dia não devem se sobrepor.

### 12.4 Snapshots são obrigatórios
Agendamentos devem armazenar:
- snapshot do nome do serviço
- snapshot da duração do serviço
- snapshot opcional do preço do serviço
- snapshot do nome do cliente
- snapshot do telefone do cliente

### 12.5 Reagendamento deve preservar histórico
Reagendamento deve:
- cancelar o agendamento original
- criar um novo agendamento
- preservar o vínculo

## 13. Constraints recomendadas

### professionals
- phone único
- email único quando presente
- constraint check de status
- constraint check de business_type
- valores de notice positivos

### clients
- único `(professional_id, phone)`
- constraint check de status

### services
- único `(professional_id, name)`
- duração maior que 0
- campos de buffer não-negativos
- preço opcional não-negativo

### availability_rules
- day_of_week válido
- start_time < end_time

### blocked_slots
- starts_at < ends_at

### appointments
- scheduled_start < scheduled_end
- status válido
- cancelled_by válido
- agendamentos cancelados devem ter cancelled_at
- agendamentos completados devem ter completed_at

## 14. Índices recomendados

### professionals
- único em phone
- único em email quando presente
- índice em status

### clients
- único em `(professional_id, phone)`
- índice em `(professional_id, full_name)`

### services
- único em `(professional_id, name)`
- índice em `(professional_id, is_active)`

### availability_rules
- índice em `(professional_id, day_of_week, is_active)`

### blocked_slots
- índice em `(professional_id, starts_at, ends_at)`

### appointments
- índice em `(professional_id, scheduled_start)`
- índice em `(professional_id, status, scheduled_start)`
- índice em `(client_id, scheduled_start)`
- índice em `rescheduled_from_appointment_id`

### notifications
- índice em `(appointment_id)`
- índice em `(status, scheduled_for)`
- índice em `(channel, status)`

## 15. Notas de implementação PostgreSQL

### Prevenção de sobreposição
O sistema implementa prevenção de sobreposição forte usando constraints de exclusão baseadas em range com índices GiST.

Constraints implementadas:
- `appointments`: `EXCLUDE USING gist (professional_id WITH =, tstzrange(scheduled_start, scheduled_end, '[)') WITH &&)` where `status = 'confirmed'`
- `blocked_slots`: `EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)`
- `availability_rules`: `EXCLUDE USING gist (professional_id WITH =, day_of_week WITH =, timerange(start_time, end_time, '[)') WITH &&)`

## 16. Compatibilidade futura

Este modelo deve permitir evolução futura para:
- contas de clientes
- múltiplos profissionais
- pagamentos
- marketplace
- nichos adicionais
- notificações mais ricas

Estes não são parte do V1 e não devem moldar o banço além de preparação razoável.

## 17. Decisões de modelagem congeladas para V1

As seguintes decisões são oficiais para V1:
- clientes são scopeados por profissional
- agendamentos devem armazenar snapshots
- availability_rules e blocked_slots são separados
- reagendamento cria um novo agendamento
- prevenção de sobreposição é uma preocupação central de integridade de dados
- nenhuma monetização é requerida no schema inicial além de campos de preço opcionais

## 18. Dependência de documento seguinte

Este documento suporta diretamente:
- api_v1.md
- design de migration
- estrutura da pasta backend
- design de testes de domínio
- sequenciamento de implementação
