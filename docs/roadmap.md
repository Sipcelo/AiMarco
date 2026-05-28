# AiMarco - roadmap.md

## 1. Purpose

This roadmap tracks the implementation path for AiMarco V1.

## 2. V1 Goal

Mobile-first scheduling for self-employed beauty professionals (barbershops, nails, hair).

## 3. Current Status — March 23, 2026

### Completed
- Docker environment
- Project structure (monorepo: apps/mobile, backend, docs)
- Database schema (Supabase/PostgreSQL)
- Backend API (Node.js + TypeScript, deployed on Railway)
- Booking flow (client guest booking, auto-confirm, overlap prevention via advisory lock)
- Professional schedule (day view, week view, status actions, cancellation)
- Blocked slots (create, list, conflict warning)
- Timezone handling (America/Sao_Paulo throughout)
- Production deploy (Railway: https://aimarco.up.railway.app)
- GitHub repository (https://github.com/Sipcelo/AiMarco)

### In Progress
- Phase 9 refinement

### Not Started
- Rescheduling by professional
- Auth for professionals (real login)
- Phone validation with BR mask
- Professional onboarding UI (register services, availability)
- Automated tests for domain logic

## 4. Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Foundation | ✅ Done |
| 1 | Documentation freeze | ✅ Done |
| 2 | Backend foundation | ✅ Done |
| 3 | Database implementation | ✅ Done |
| 4 | API implementation | ✅ Done |
| 5 | Domain validation and tests | ⬜ Pending |
| 6 | Mobile app foundation | ✅ Done |
| 7 | Booking flow | ✅ Done |
| 8 | Professional schedule experience | ✅ Done |
| 9 | Refinement | 🔄 In progress |

## 5. Phase 9 Remaining Deliverables

- [ ] Rescheduling by professional
- [ ] Auth for professionals
- [ ] Phone validation with BR mask
- [ ] Professional onboarding UI
- [ ] Automated tests (availability, overlap, cancellation)
- [ ] Documentation update (progress.md, api_v1.md)

## 6. V1 Priorities (unchanged)

1. Scheduling reliability
2. Overlap prevention
3. Availability correctness
4. Simple booking flow
5. Clear professional schedule view
6. Cancellation and rescheduling integrity

## 7. Non-goals for V1 (unchanged)

- Payments
- Subscriptions
- Marketplace
- Customer accounts
- Multiple professionals per schedule
- Advanced CRM
- Marketing automation
- Financial reports

## 8. Security checklist (to implement before real users)

- [ ] JWT + RBAC on all professional endpoints
- [ ] Ownership check (WHERE id=$id AND professional_id=$user)
- [ ] Rate limiting on public booking endpoint
- [ ] DTOs — never expose raw DB objects
- [ ] Webhook signature validation
- [ ] Mass assignment whitelist

---

## 🇧🇷 Versão em Português

## 1. Propósito

Este roadmap acompanha o caminho de implementação do AiMarco V1.

## 2. Objetivo do V1

Agendamento mobile-first para profissionais de beleza autônomos (barbearias, unhas, cabelo).

## 3. Status Atual — 23 de Março de 2026

### Concluído
- Ambiente Docker
- Estrutura do projeto (monorepo: apps/mobile, backend, docs)
- Schema do banco de dados (Supabase/PostgreSQL)
- API Backend (Node.js + TypeScript, deployado no Railway)
- Fluxo de agendamento (booking de convidado, auto-confirmação, prevenção de sobreposição via advisory lock)
- Agenda do profissional (visão diária, visão semanal, ações de status, cancelamento)
- Horários bloqueados (criar, listar, aviso de conflito)
- Tratamento de timezone (America/Sao_Paulo em toda parte)
- Deploy em produção (Railway: https://aimarco.up.railway.app)
- Repositório GitHub (https://github.com/Sipcelo/AiMarco)

### Em Progresso
- Fase 9 de refinamento

### Não Iniciado
- Reagendamento pelo profissional
- Autenticação para profissionais (login real)
- Validação de telefone com máscara BR
- UI de onboarding do profissional (registrar serviços, disponibilidade)
- Testes automatizados para lógica de domínio

## 4. Status das Fases

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Fundação | ✅ Concluído |
| 1 | Congelamento da documentação | ✅ Concluído |
| 2 | Fundação do backend | ✅ Concluído |
| 3 | Implementação do banco | ✅ Concluído |
| 4 | Implementação da API | ✅ Concluído |
| 5 | Validação de domínio e testes | ⬜ Pendente |
| 6 | Fundação do app mobile | ✅ Concluído |
| 7 | Fluxo de agendamento | ✅ Concluído |
| 8 | Experiência de agenda do profissional | ✅ Concluído |
| 9 | Refinamento | 🔄 Em progresso |

## 5. Entregas Restantes da Fase 9

- [ ] Reagendamento pelo profissional
- [ ] Autenticação para profissionais
- [ ] Validação de telefone com máscara BR
- [ ] UI de onboarding do profissional
- [ ] Testes automatizados (disponibilidade, sobreposição, cancelamento)
- [ ] Atualização da documentação (progress.md, api_v1.md)

## 6. Prioridades do V1 (inalteradas)

1. Confiabilidade de agendamento
2. Prevenção de sobreposição
3. Correção de disponibilidade
4. Fluxo de agendamento simples
5. Visão de agenda profissional clara
6. Integridade de cancelamento e reagendamento

## 7. Não-objetivos do V1 (inalterados)

- Pagamentos
- Assinaturas
- Marketplace
- Contas de clientes
- Múltiplos profissionais por agenda
- CRM avançado
- Automação de marketing
- Relatórios financeiros

## 8. Checklist de segurança (implementar antes de usuários reais)

- [ ] JWT + RBAC em todos os endpoints de profissional
- [ ] Verificação de propriedade (WHERE id=$id AND professional_id=$user)
- [ ] Rate limiting no endpoint público de booking
- [ ] DTOs — nunca expor objetos brutos do banco
- [ ] Validação de assinatura de webhook
- [ ] Whitelist de mass assignment
