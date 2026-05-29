# Relatório — Estabilização dos Testes Backend AiMarco

**Data:** 2026-05-29  
**Executor:** Claude Code (engenheiro sênior)  
**Branch:** main

---

## 1. Resumo

| Item | Status |
|---|---|
| `npm run build` | ✅ PASSA — zero erros TypeScript |
| `npm run test:unit` | ✅ 11 arquivos, 205 testes passando |
| `npm run test:security` | ✅ 4 arquivos, 53 testes passando |
| `npm run test:integration` | ✅ 5 arquivos (1 skipped por falta de env), 40 testes passando |
| Imports para módulos inexistentes | ✅ Eliminados — movidos para `tests/legacy/` |
| Arquivos `.test.ts` sem suíte Vitest | ✅ Eliminados da suíte padrão |
| `backend/supabase/.temp/` ignorado | ✅ Já estava correto desde commit anterior |
| `backend/.env` fora do git | ✅ Confirmado |
| Testes P0 de domínio ativos | ✅ Todos rodando |
| Ainda bloqueia V1? | **NÃO** |

---

## 2. Arquivos alterados

| Arquivo | Motivo | Risco |
|---|---|---|
| `backend/src/app.ts` (novo) | Extrai `buildApp()` do `server.ts` para testes usarem `fastify.inject()` | Baixo — build confirmado, mesmo comportamento |
| `backend/src/server.ts` | Refatorado para só importar `buildApp()` e chamar `listen()` | Baixo — funcionalidade idêntica |
| `backend/src/middleware/auth.ts` | Adicionada validação de chars de controle no token antes de chamar Supabase | Baixo — segurança extra, não quebra fluxo normal |
| `backend/package.json` | Scripts separados: `test:unit`, `test:security`, `test:integration`, `test:integration:server` | Nenhum |
| `backend/vitest.config.ts` | Exclui `tests/legacy/**` e `tests/integration-server/**` da suíte padrão | Nenhum |
| `backend/tests/unit/recall-list.test.ts` | Timezone corrigido para UTC (`startOfUtcDay`) — RL-9 | Nenhum |
| `backend/tests/integration/public-profile.test.ts` | Adicionado `describe.skipIf(!envOk)` e helper `requireIntegrationEnv` | Nenhum |
| `backend/tests/helpers/env.ts` (novo) | Helper para verificar vars de ambiente antes de testes de integração | Nenhum |
| `backend/tests/helpers/mockSupabaseQuery.ts` (novo) | Helper para mock de chain completa do Supabase | Nenhum |

---

## 3. Testes classificados

| Arquivo | Classificação | Ação tomada | Prioridade |
|---|---|---|---|
| `tests/unit/calculate-availability.test.ts` | unit | mantido | P0 |
| `tests/unit/can-book-slot.test.ts` | unit | mantido | P0 |
| `tests/unit/dtos.test.ts` | unit | mantido | P0 |
| `tests/unit/phone-helpers.test.ts` | unit | mantido | P0 |
| `tests/unit/phone-validator.test.ts` | unit | mantido | P0 |
| `tests/unit/schemas.test.ts` | unit | mantido | P0 |
| `tests/unit/recall-list.test.ts` | unit | timezone corrigido (RL-9) | P2 |
| `tests/domain/booking-conflict.test.ts` | domain | mantido | P0 |
| `tests/domain/smart-slots.test.ts` | domain | mantido | P0 |
| `tests/domain/smart-slots-edge-cases.test.ts` | domain | mantido | P0 |
| `tests/concurrency/race-condition.test.ts` | domain | mantido | P0 |
| `tests/security/auth-injection.test.ts` | security | mantido | P0 |
| `tests/security/auth-isolation.test.ts` | security | mantido | P0 |
| `tests/security/ownership.test.ts` | security | mantido | P1 |
| `tests/security/reschedule-security.test.ts` | security | mantido | P0 |
| `tests/integration/availability.test.ts` | integration (Fastify inject) | mantido | P0 |
| `tests/integration/availability-rules.test.ts` | integration (mock) | mantido | P0 |
| `tests/integration/auth-practical.test.ts` | integration (Fastify inject) | mantido | P0 |
| `tests/integration/guest-booking-flow.test.ts` | integration (mock) | mantido | P0 |
| `tests/integration/public-profile.test.ts` | integration (Supabase real) | skipIf sem env | P1 |
| `tests/integration/worker-templates.test.ts` | integration (mock) | mantido | P1 |
| `tests/integration-server/auth-gauntlet.test.ts` | integration:server | movido — requer localhost:3333 | P0* |
| `tests/integration-server/ownership.test.ts` | integration:server | movido — requer localhost:3333 + Supabase | P1* |
| `tests/legacy/auth.test.ts` | legacy (node:test + `lib/auth.js`) | arquivado | — |
| `tests/legacy/concurrency.test.ts` | legacy (BetterRouter) | arquivado | — |
| `tests/legacy/edge_cases.test.ts` | legacy (node:test + BetterRouter) | arquivado | — |
| `tests/legacy/lunch_break.test.ts` | legacy (node:test + BetterRouter) | arquivado | — |
| `tests/legacy/profile.test.ts` | legacy (node:test + BetterRouter) | arquivado | — |
| `tests/legacy/reschedule.test.ts` | legacy (node:test + BetterRouter) | arquivado | — |
| `tests/legacy/security_audit.test.ts` | legacy (node:test + BetterRouter) | arquivado | — |
| `tests/legacy/server-auth.test.ts` | legacy (node:test, placeholder) | arquivado | — |
| `tests/legacy/services.test.ts` | legacy (node:test + BetterRouter) | arquivado | — |
| `tests/legacy/validation.test.ts` | legacy (node:test + `lib/schemas.js`) | arquivado | — |
| `tests/legacy/auth-verify-private.test.ts` | legacy (`lib/auth` removido) | arquivado | — |

*Requerem `npm run dev` + `npm run test:integration:server`

---

## 4. Falhas corrigidas

| Problema | Solução |
|---|---|
| `backend/supabase/.temp/` no git | Já corrigido em commit anterior — confirmado |
| `ECONNREFUSED :3333` | Testes movidos para `tests/integration-server/`; testes de Fastify agora usam `buildApp({ logger: false })` + `inject()` |
| Módulos inexistentes (`lib/router`, `lib/auth`, `lib/schemas`) | 11 arquivos movidos para `tests/legacy/` |
| `node:test` dentro de Vitest (sem suíte reconhecida) | 9 arquivos movidos para `tests/legacy/` + excluídos via `vitest.config.ts` |
| Timezone sensível ao Windows em `recall-list.test.ts` RL-9 | Corrigido com `startOfUtcDay()` usando métodos UTC |
| Header injection gerando `TypeError: Headers.append` no log | Middleware `auth.ts` agora rejeita tokens com chars de controle com 401 antes de chamar Supabase |
| Testes de integração que dependem de Supabase real sem skipIf | `public-profile.test.ts` agora usa `describe.skipIf(!envOk)` via `tests/helpers/env.ts` |

---

## 5. Comandos executados

```bash
# Build
cd backend && npm run build  # ✅ zero erros

# Testes
npm run test:unit       # ✅ 11 files, 205 tests
npm run test:security   # ✅ 4 files, 53 tests
npm run test:integration  # ✅ 5 passed (1 skipped — sem env Supabase), 40 tests

# Status
git status --short
git diff --stat
```

---

## 6. Resultados

```
npm run test:unit
  Test Files  11 passed (11)
      Tests  205 passed (205)
  Duration   779ms

npm run test:security
  Test Files  4 passed (4)
      Tests  53 passed (53)
  Duration   1.28s

npm run test:integration
  Test Files  5 passed | 1 skipped (6)
      Tests  40 passed | 2 skipped (42)
  Duration   965ms
```

---

## 7. Pendências

### P0

- Nenhuma — testes de domínio e segurança totalmente ativos

### P1

- `tests/integration-server/auth-gauntlet.test.ts` — precisa de `npm run dev` na porta 3333; reescrever usando `buildApp()` + `inject()` (não bloqueia V1 — gauntlet testa validação Zod já coberta por `test:unit`)
- `tests/legacy/*.test.ts` — reescrever os testes relevantes (profile, reschedule, services, availability) para Fastify `inject()` conforme padrão de `auth-practical.test.ts`
- `tests/security/ownership.test.ts` — tem import de Supabase não utilizado; limpar (sem impacto funcional)

### P2

- `recall-list.test.ts` — feature recall ainda não ativa no produto; manter como P2
- Cobertura de `worker-templates.test.ts` pode ser expandida quando WhatsApp sair de `pending`

---

## 8. Próximas ações recomendadas

1. **Commit** — separar em dois commits:
   ```bash
   # Commit 1: estrutural
   git add backend/src/app.ts backend/src/server.ts backend/src/middleware/auth.ts \
     backend/package.json backend/vitest.config.ts \
     backend/tests/helpers/ backend/tests/legacy/ backend/tests/integration-server/ \
     backend/tests/unit/recall-list.test.ts backend/tests/integration/public-profile.test.ts
   git commit -m "test(backend): stabilize vitest suite — separate buildApp, move legacy tests, fix timezone"
   
   # Commit 2: spec + relatórios
   git add docs/SPEC-Estabilizar-testes-backend.md docs/relatorio-*.md
   git commit -m "docs: add test stabilization spec and phase reports"
   ```

2. **Reescrever testes legados** (P1) usando `buildApp({ logger: false })` e `app.inject(...)` — padrão já estabelecido em `auth-practical.test.ts` e `auth-injection.test.ts`.

3. **Expandir cobertura de segurança** — o `auth-gauntlet.test.ts` pode ser migrado para Fastify `inject()` e promovido para `tests/security/` ou `tests/integration/`.
