# AiMarco - architecture.md

## 1. Purpose

The initial architecture of AiMarco must prioritize:
- operational simplicity
- domain clarity
- low friction for V1
- high schedule reliability
- strong booking conflict prevention
- future evolution without premature complexity

V1 must not be a fragile prototype, but it also must not become an overengineered system too early.
The goal is a lean, reliable, and extensible foundation.

## 2. Architectural principles

### 2.1 Domain first
The core of the system is scheduling.
Every technical decision must protect:
- availability rules
- blocked time slots
- service duration
- safe appointment creation
- appointment history integrity

### 2.2 Mobile-first
The product is designed primarily for mobile usage, especially for the professional side.

### 2.3 One professional per schedule
In V1, each schedule belongs to exactly one professional.
There is no multi-professional flow in the first version.

### 2.4 Guest customer flow
Customers do not need an account in V1.
They book as guests and are identified by phone number.

### 2.5 Auto-confirmed appointments
Appointments are automatically confirmed after all business rules pass.

### 2.6 Clear separation of concepts
The system must clearly separate:
- services
- weekly availability rules
- blocked slots
- appointments
- notifications

## 3. High-level architecture

AiMarco starts with three main layers:

### 3.1 Client applications
Responsible for the user interface.

#### Professional side
- onboarding
- service management
- weekly availability management
- blocked slot management
- daily schedule view
- weekly schedule view
- appointment actions

#### Customer side
- public booking page
- service selection
- date selection
- available slot selection
- booking confirmation
- cancellation
- rescheduling

### 3.2 Backend domain layer
Responsible for:
- authentication for professionals
- domain rules
- availability calculation
- appointment creation
- cancellation
- rescheduling
- persistence
- notification event generation

### 3.3 Database layer
Responsible for consistent persistence of:
- professionals
- clients
- services
- availability_rules
- blocked_slots
- appointments
- notifications

## 4. Initial technology stack

### Frontend
- React Native with Expo

### Backend / BaaS
- Supabase

### Database
- PostgreSQL

### Authentication
- Supabase Auth for professionals

### Development environment
- Docker
- PowerShell as default shell on Windows

## 5. Core modules

### 5.1 Professionals module
Responsibilities:
- professional profile
- schedule preferences
- booking notice settings
- cancellation and reschedule settings

### 5.2 Services module
Responsibilities:
- service creation
- duration definition
- optional pricing field
- activation and deactivation

### 5.3 Availability module
Responsibilities:
- weekly availability rules
- blocked slots
- available slot calculation
- working-hours validation

### 5.4 Appointments module
Responsibilities:
- appointment creation
- appointment status transitions
- cancellation
- rescheduling
- appointment snapshots

### 5.5 Notifications module
Responsibilities:
- notification event creation
- notification persistence
- future support for push, WhatsApp, and SMS

## 6. Main domain entities

### professionals
Own the schedule and define services and availability.

### clients
Represent guest customers identified by phone number.

### services
Define what can be booked and how long it takes.

### availability_rules
Represent recurring weekly working hours.

### blocked_slots
Represent one-off unavailable time windows.

### appointments
Represent actual bookings in the schedule.

### notifications
Represent outbound communication records and future delivery events.

## 7. Critical business guarantees

### 7.1 No overlapping active appointments
A professional must never have overlapping active appointments.

### 7.2 Final server-side recalculation
Even if a slot was shown to the customer before, the backend must recalculate availability at booking time.

### 7.3 Rescheduling is not in-place editing
Rescheduling is internally handled as:
- cancellation of the original appointment
- creation of a new linked appointment

### 7.4 Snapshots are mandatory
Appointments must store snapshots of:
- service name
- service duration
- optional price
- client name
- client phone

### 7.5 Simple official statuses
V1 official statuses:
- confirmed
- cancelled
- completed
- no_show

## 8. Main application flow

### Booking flow
1. Customer opens the professional public booking page
2. Customer selects a service
3. Customer selects a date
4. Backend calculates valid available slots
5. Customer selects a slot
6. Customer enters name and phone number
7. Backend recalculates availability
8. System creates a confirmed appointment
9. System records notification events
10. Customer receives confirmation

## 9. Quality strategy

The project follows these principles:
- architecture before implementation
- business rules before UI details
- testing of critical domain rules
- AI as executor, not decision-maker
- documentation as operating context

### Minimum quality expectations
- isolated scheduling logic
- testable domain rules
- separation between UI and domain logic
- explicit business rules
- updated documentation

## 10. Out of scope for V1
The architecture must not include V1 complexity for:
- payments
- subscriptions
- billing
- marketplace
- multi-professional scheduling
- expansion to other service niches

## 11. Future evolution
The architecture should allow future expansion for:
- push notifications
- WhatsApp notifications
- SMS notifications
- customer authentication
- multi-professional support
- payments
- marketplace
- additional niches

These features are not part of V1, but V1 should not block them.

## 12. Frozen V1 decisions
The following decisions are fixed for V1:
- one schedule per professional
- guest booking only
- phone-based customer identity
- auto-confirmed appointments
- 15-minute visual time grid
- 30-minute minimum booking notice
- 2-hour minimum cancellation notice
- 2-hour minimum reschedule notice
- no monetization
- no marketplace

## 13. Risks the architecture must avoid
- mixing availability rules with blocked slots
- allowing weak booking validation
- editing historical appointments without traceability
- coupling UI too tightly with domain logic
- adding features outside V1 scope too early

## 14. Derived technical documents
This architecture document is the foundation for:
- roadmap.md
- progress.md
- learn.md
- modelagem_inicial_banco.md
- api_v1.md
- domain tests
- implementation planning

---

## 🇧🇷 Versão em Português

## 1. Propósito

A arquitetura inicial do AiMarco deve priorizar:
- simplicidade operacional
- clareza de domínio
- baixa atrito para V1
- alta confiabilidade de agenda
- forte prevenção de conflitos de agendamento
- evolução futura sem complexidade prematura

V1 não deve ser um protótipo frágil, mas também não deve se tornar um sistema superengenheirado muito cedo.
O objetivo é uma fundação enxuta, confiável e extensível.

## 2. Princípios arquiteturais

### 2.1 Domínio primeiro

O núcleo do sistema é agendamento (scheduling).
Cada decisão técnica deve proteger:
- regras de disponibilidade
- horários bloqueados
- duração do serviço
- criação segura de agendamentos
- integridade do histórico de agendamentos

### 2.2 Mobile-first

O produto é projetado principalmente para uso mobile, especialmente para o lado do profissional.

### 2.3 Um profissional por agenda

No V1, cada agenda pertence exatamente a um profissional.
Não há fluxo multi-profissionais na primeira versão.

### 2.4 Fluxo de cliente convidado (guest)

Clientes não precisam de conta no V1.
Eles agendam como convidados e são identificados pelo número de telefone.

### 2.5 Agendamentos auto-confirmados

Agendamentos são automaticamente confirmados após todas as regras de negócio passarem.

### 2.6 Separação clara de conceitos

O sistema deve claramente separar:
- serviços
- regras de disponibilidade semanal
- horários bloqueados
- agendamentos
- notificações

## 3. Arquitetura de alto nível

AiMarco começa com três camadas principais:

### 3.1 Aplicações cliente

Responsáveis pela interface do usuário.

#### Lado profissional
- onboarding
- gestão de serviços
- gestão de disponibilidade semanal
- gestão de horários bloqueados
- visualização de agenda diária
- visualização de agenda semanal
- ações de agendamento

#### Lado cliente
- página pública de agendamento
- seleção de serviço
- seleção de data
- seleção de horário disponível
- confirmação de agendamento
- cancelamento
- reagendamento

### 3.2 Camada de domínio do backend

Responsável por:
- autenticação de profissionais
- regras de domínio
- cálculo de disponibilidade
- criação de agendamento
- cancelamento
- reagendamento
- persistência
- geração de eventos de notificação

### 3.3 Camada de banco de dados

Responsável por persistência consistente de:
- profissionais
- clientes
- serviços
- regras de disponibilidade
- horários bloqueados
- agendamentos
- notificações

## 4. Stack tecnológica inicial

### Frontend
- React Native com Expo

### Backend / BaaS
- Supabase

### Banco de dados
- PostgreSQL

### Autenticação
- Supabase Auth para profissionais

### Ambiente de desenvolvimento
- Docker
- PowerShell como shell padrão no Windows

## 5. Módulos principais

### 5.1 Módulo Professionals

Responsabilidades:
- perfil do profissional
- preferências de agenda
- configurações de aviso de agendamento
- configurações de cancelamento e reagendamento

### 5.2 Módulo Services

Responsabilidades:
- criação de serviços
- definição de duração
- campo de preço opcional
- ativação e desativação

### 5.3 Módulo Availability

Responsabilidades:
- regras de disponibilidade semanal
- horários bloqueados
- cálculo de slots disponíveis
- validação de horário de trabalho

### 5.4 Módulo Appointments

Responsabilidades:
- criação de agendamento
- transições de status
- cancelamento
- reagendamento
- snapshots de agendamento

### 5.5 Módulo Notifications

Responsabilidades:
- criação de eventos de notificação
- persistência de notificações
- suporte futuro para push, WhatsApp e SMS

## 6. Entidades principais do domínio

### professionals

Possuem a agenda e definem serviços e disponibilidade.

### clients

Representam clientes convidados identificados por número de telefone.

### services

Definem o que pode ser agendado e quanto tempo leva.

### availability_rules

Representam horários de trabalho recorrentes semanais.

### blocked_slots

Representam janelas de tempo indisponíveis pontuais.

### appointments

Representam bookings reais na agenda.

### notifications

Representam registros de comunicação de saída e eventos de entrega futuros.

## 7. Garantias críticas de negócio

### 7.1 Nenhum agendamento ativo sobreposto

Um profissional nunca deve ter agendamentos ativos sobrepostos.

### 7.2 Recalculo final server-side

Mesmo que um slot foi mostrado ao cliente antes, o backend deve recalcular disponibilidade no momento do agendamento.

### 7.3 Reagendamento não é edição in-place

Reagendamento é internamente tratado como:
- cancelamento do agendamento original
- criação de um novo agendamento vinculado

### 7.4 Snapshots são obrigatórios

Agendamentos devem armazenar snapshots de:
- nome do serviço
- duração do serviço
- preço opcional
- nome do cliente
- telefone do cliente

### 7.5 Status oficiais simples

Status oficiais do V1:
- confirmed
- cancelled
- completed
- no_show

## 8. Fluxo principal da aplicação

### Fluxo de agendamento

1. Cliente abre a página pública de agendamento do profissional
2. Cliente seleciona um serviço
3. Cliente seleciona uma data
4. Backend calcula slots disponíveis válidos
5. Cliente seleciona um slot
6. Cliente insere nome e telefone
7. Backend recalcula disponibilidade
8. Sistema cria agendamento confirmado
9. Sistema registra eventos de notificação
10. Cliente recebe confirmação

## 9. Estratégia de qualidade

O projeto segue estes princípios:
- arquitetura antes de implementação
- regras de negócio antes de detalhes de UI
- teste de regras críticas de domínio
- IA como executor, não tomador de decisão
- documentação como contexto operacional

### Expectativas mínimas de qualidade
- lógica de agendamento isolada
- regras de domínio testáveis
- separação entre UI e lógica de domínio
- regras de negócio explícitas
- documentação atualizada

## 10. Fora do escopo do V1

A arquitetura não deve incluir complexidade V1 para:
- pagamentos
- assinaturas
- faturamento
- marketplace
- agendamento multi-profissional
- expansão para outros nichos de serviço

## 11. Evolução futura

A arquitetura deve permitir expansão futura para:
- notificações push
- notificações WhatsApp
- notificações SMS
- autenticação de clientes
- suporte multi-profissional
- pagamentos
- marketplace
- nichos adicionais

Essas features não são parte do V1, mas V1 não deve bloqueá-las.

## 12. Decisões congeladas para V1

As seguintes decisões estão fixas para V1:
- uma agenda por profissional
- agendamento apenas como convidado
- identidade de cliente por telefone
- agendamentos auto-confirmados
- grade de tempo visual de 15 minutos
- pré-aviso mínimo de agendamento de 30 minutos
- aviso mínimo de cancelamento de 2 horas
- aviso mínimo de reagendamento de 2 horas
- sem monetização
- sem marketplace

## 13. Riscos que a arquitetura deve evitar
- misturar regras de disponibilidade com horários bloqueados
- permitir validação de agendamento fraca
- editar agendamentos históricos sem rastreabilidade
- acoplar UI muito à lógica de domínio
- adicionar features fora do escopo V1 muito cedo

## 14. Documentos técnicos derivados

Este documento de arquitetura é a fundação para:
- roadmap.md
- progress.md
- learn.md
- modelagem_inicial_banco.md
- api_v1.md
- testes de domínio
- planejamento de implementação
