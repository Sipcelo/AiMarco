# Relatório — Fase 2: Auditoria dos Testes Backend

**Data:** 2026-05-29  
**Executor:** Claude Code (engenheiro sênior)

---

## Resumo de contexto lido

1. **Arquitetura ativa:** Fastify + TypeScript + ESM. Camada: `src/server.ts` → `src/middleware/auth.ts` (authPlugin) → `src/lib/fastify-adapter.ts` → `src/routes/v1/**`. Supabase como BaaS/DB.
2. **Garantias de domínio que não podem ser quebradas:** sem overlap de agendamentos ativos; recálculo server-side no momento do booking; reagendamento = cancelamento + novo; snapshots obrigatórios; ownership checks em todos os endpoints protegidos.
3. **Testes P0 para V1:** availability, can-book-slot, overlap/conflict, concorrência/race, DTO sanitization, auth middleware (401/403), ownership checks, public booking, cancel/reschedule, phone validation, schema validation.
4. **Arquivos legados identificados:** qualquer teste importando `src/lib/router.js` (BetterRouter), `src/lib/auth.js` (removido), `src/lib/schemas.js` (movido para `src/shared/schemas/`), ou usando `node:test` em vez de Vitest.

---

## Tabela de auditoria

| Arquivo | Tipo | Vitest? | node:test? | Depende localhost? | Depende Supabase real? | Import inválido? | Ação | Prioridade |
|---|---|---|---|---|---|---|---|---|
| `tests/unit/calculate-availability.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/unit/can-book-slot.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/unit/dtos.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/unit/phone-helpers.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/unit/phone-validator.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/unit/schemas.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/unit/recall-list.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | corrigir timezone (RL-9) | P2 |
| `tests/domain/booking-conflict.test.ts` | domain | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/domain/smart-slots.test.ts` | domain | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/domain/smart-slots-edge-cases.test.ts` | domain | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/concurrency/race-condition.test.ts` | domain | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/security/auth-injection.test.ts` | security | ✅ | ❌ | ❌ | ❌ | ❌ | manter (Fastify inject) | P0 |
| `tests/security/auth-isolation.test.ts` | security | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/security/ownership.test.ts` | security | ✅ | ❌ | ❌ | ✅ (Supabase real) | ❌ | separar com skipIf | P1 |
| `tests/security/reschedule-security.test.ts` | security | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/security/auth-verify-private.test.ts` | legacy | ✅ | ❌ | ❌ | ❌ | ✅ `src/lib/auth` | mover para `tests/legacy/` | P1 |
| `tests/auth/ownership.test.ts` | integration:server | ✅ | ❌ | ✅ localhost:3333 | ✅ Supabase real | ❌ | mover para `tests/integration-server/` + skipIf | P1 |
| `tests/integration/auth.test.ts` | legacy | ❌ | ✅ node:test | ❌ (skip all) | ❌ | ✅ `src/lib/auth.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/auth-gauntlet.test.ts` | integration:server | ✅ | ❌ | ✅ localhost:3333 | ❌ | ❌ | mover para `tests/integration-server/` + skipIf | P0 |
| `tests/integration/auth-practical.test.ts` | security | ✅ | ❌ | ❌ (Fastify inject) | ❌ | ❌ | manter | P0 |
| `tests/integration/availability.test.ts` | security | ✅ | ❌ | ❌ (Fastify inject) | ❌ | ❌ | manter | P0 |
| `tests/integration/availability-rules.test.ts` | unit/domain | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/integration/concurrency.test.ts` | legacy | ✅ | ❌ | ❌ (porta 3339 própria) | ❌ | ✅ `src/lib/router.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/edge_cases.test.ts` | legacy | ❌ | ✅ node:test | ❌ (porta 3340) | ❌ | ✅ `src/lib/router.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/guest-booking-flow.test.ts` | domain | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P0 |
| `tests/integration/lunch_break.test.ts` | legacy | ❌ | ✅ node:test | ❌ (porta 3341) | ❌ | ✅ `src/lib/router.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/profile.test.ts` | legacy | ❌ | ✅ node:test | ❌ (porta 3336) | ❌ | ✅ `src/lib/router.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/public-profile.test.ts` | integration | ? | ? | ? | ? | ? | verificar | P0 |
| `tests/integration/reschedule.test.ts` | legacy | ❌ | ✅ node:test | ❌ (porta 3337) | ❌ | ✅ `src/lib/router.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/security_audit.test.ts` | legacy | ❌ | ✅ node:test | ❌ (porta 3338) | ❌ | ✅ `src/lib/router.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/server-auth.test.ts` | legacy | ❌ | ✅ node:test | ❌ (truque: passa sem servidor) | ❌ | ❌ | mover para `tests/legacy/` | P2 |
| `tests/integration/services.test.ts` | legacy | ❌ | ✅ node:test | ❌ (porta 3334) | ❌ | ✅ `src/lib/router.js` | mover para `tests/legacy/` | P1 |
| `tests/integration/validation.test.ts` | legacy | ❌ | ✅ node:test | ❌ | ❌ | ✅ `src/lib/schemas.js` | migrar schemas → `src/shared/schemas/` ou mover para legacy | P1 |
| `tests/integration/worker-templates.test.ts` | unit | ✅ | ❌ | ❌ | ❌ | ❌ | manter | P1 |

---

## Problemas identificados por categoria

### A. node:test dentro de Vitest (suíte não reconhecida)

9 arquivos usam `import { test } from 'node:test'` mas são incluídos pelo Vitest via `include: ["tests/**/*.test.ts"]`. Eles não têm suíte reconhecida pelo Vitest e geram ruído/falso "no test suite found":

- `tests/integration/auth.test.ts`
- `tests/integration/edge_cases.test.ts`
- `tests/integration/lunch_break.test.ts`
- `tests/integration/profile.test.ts`
- `tests/integration/reschedule.test.ts`
- `tests/integration/security_audit.test.ts`
- `tests/integration/server-auth.test.ts`
- `tests/integration/services.test.ts`
- `tests/integration/validation.test.ts`

### B. Imports de módulos inexistentes

- `src/lib/router.js` (BetterRouter) — removido: 7 arquivos de integração
- `src/lib/auth.js` / `src/lib/auth` — removido: `auth.test.ts`, `auth-verify-private.test.ts`
- `src/lib/schemas.js` — movido para `src/shared/schemas/`: `validation.test.ts`

### C. Testes que dependem de localhost:3333

- `tests/integration/auth-gauntlet.test.ts` — P0, precisa de servidor externo
- `tests/auth/ownership.test.ts` — P1, precisa de servidor + Supabase real

### D. Recall-list timezone (RL-9)

- `tests/unit/recall-list.test.ts` — usa `setHours(0,0,0,0)` sensível ao timezone local Windows

### E. Mock chain incompleto de Supabase

- Qualquer teste que moque `supabase.from().select().eq().gte().lte().order()` sem cobrir a chain completa

---

## Ações planejadas para Fases 3-9

1. Criar `tests/legacy/` e mover 9 arquivos node:test + arquivos com imports inválidos
2. Criar `tests/integration-server/` e mover testes que dependem de localhost:3333
3. Separar `buildApp()` em `src/app.ts` para testes usarem `fastify.inject()`
4. Corrigir timezone em `recall-list.test.ts`
5. Criar `tests/helpers/mockSupabaseQuery.ts`
6. Criar `tests/helpers/env.ts`
7. Atualizar `package.json` scripts
8. Atualizar `vitest.config.ts` para excluir `tests/legacy/` e `tests/integration-server/`

---

## Próxima fase

→ **Fase 3 — Refatoração do servidor (`src/app.ts` + `buildApp()`)**
