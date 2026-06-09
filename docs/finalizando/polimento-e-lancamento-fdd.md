# FDD — Polimento e Lançamento (Piloto) — AiMarco V1

> **Status:** fase de polimento pré-piloto (Etapas 0–9 do `task.md` concluídas)
> **Última atualização:** 2026-06-09
> **Base de skills:** `agent-skills/skills/using-agent-skills/SKILL.md` (mapeamento mestre)
> **Escopo:** preparar o V1 para disponibilização real — revisão, limpeza, verificação, configuração de produção e lançamento controlado.

---

## 1. Overview e Organização FDD

O V1 está funcionalmente completo: backend Fastify + Supabase com 205 testes unit + 53 security + 79 integration verdes, web com smoke E2E 6/6 do booking público e mobile com `tsc --noEmit` zero erros. Este documento organiza a **fase seguinte** — polir e disponibilizar — usando o pipeline de skills do `agent-skills/` aplicado à realidade do projeto.

### 1.1 Posição na hierarquia oficial

Conforme `docs/guidelines.md` (Alto nível → Etapa → Prompt):

| Artefato | Papel nesta fase |
|----------|------------------|
| `docs/finalizando/FDD.md` | Produto (o que o V1 é) — **não muda** nesta fase |
| **Este documento** | FDD da fase de polimento (o que falta para disponibilizar) |
| `docs/plan.md` | Ganha uma futura "Etapa 10 — Polimento e Lançamento" derivada daqui (após aprovação) |
| `docs/task.md` | Ganha o checklist da Etapa 10 derivado da seção 4 deste documento |

**Regra de geração preservada:** nenhuma task deste documento foi inventada. Toda task rastreia para uma fonte real: diff pendente no working tree, pendência anotada no fim do `task.md`, prioridade P0/P1/P2 do `CLAUDE.md` ou risco do `FDD.md` §7.

### 1.2 Módulos desta fase

```txt
M1  Higiene do repositório      (diffs pendentes, artefatos soltos, agent-skills/)
M2  Limpeza de código legado    (RPCs redundantes, worktree antigo)
M3  Revisão de segurança        (secrets, surfacing de erro 500, rate limit, DTOs)
M4  Banco e RPCs                (validar versões das RPCs no Supabase)
M5  Polimento web               (booking público /p/:slug, performance)
M6  Configuração de produção    (Railway, Supabase, Expo/EAS, CORS)
M7  Validação fim-a-fim         (web → backend → mobile → notificação)
M8  Lançamento                  (checklist, monitoramento, rollback, tag v1)
```

---

## 2. Guidelines

Derivam de `docs/guidelines.md` + `CLAUDE.md` e incorporam os **Core Operating Behaviors** do `using-agent-skills/SKILL.md`. São inegociáveis em toda task desta fase:

1. **Fundamentação obrigatória** — toda ação rastreia até um item deste FDD, do `plan.md` ou do `task.md`. Nada de features novas: esta fase é polimento, não construção.
2. **Surface assumptions** — antes de executar qualquer task não trivial, declarar explicitamente as premissas ("ASSUMPTIONS I'M MAKING: …") e aguardar correção se houver ambiguidade.
3. **Gerenciar confusão ativamente** — ao encontrar inconsistência (ex.: spec diz X, código faz Y), **parar**, nomear a confusão e perguntar. Nunca prosseguir com palpite.
4. **Push back quando justificado** — apontar problemas concretos (quantificados quando possível) e propor alternativa. Sycophancy é failure mode.
5. **Enforce simplicity** — preservar a fundação enxuta do V1. Se a "limpeza" virar refatoração de arquitetura, está fora de escopo.
6. **Scope discipline** — tocar só o que a task pede. Não remover código/comentário que não entende, não "arrumar" sistemas adjacentes.
7. **Verify, don't assume** — task só fecha com evidência: build, suíte de testes, `git status --short`, scan de secrets. "Parece certo" nunca é suficiente.
8. **Segurança primeiro** — nunca versionar ou exibir valores de secrets. Achados são reportados como `caminho + nome da variável + tipo + ação recomendada`, nunca o valor.
9. **Commit por tema** — cada módulo fecha com commit pequeno e temático (`chore:`, `fix:`, `docs:`, `test:`), nunca misturando temas.

---

## 3. Pipeline de skills (mapeado ao AiMarco)

O V1 já está construído, então o pipeline desta fase usa principalmente o subconjunto **Review → Verify → Ship** do lifecycle do `using-agent-skills/SKILL.md`, com skills de Build aplicadas pontualmente.

```txt
code-review-and-quality ─┬─► code-simplification ──► security-and-hardening
                         │
                         ▼
test-driven-development ──► browser-testing / E2E ──► performance-optimization
                         │
                         ▼
git-workflow-and-versioning ──► ci-cd-and-automation ──► documentation-and-adrs ──► shipping-and-launch
```

| Fase | Skill | Aplicação concreta no AiMarco | Módulo |
|------|-------|-------------------------------|--------|
| Review | `code-review-and-quality` | Revisar diffs pendentes (`BookingSuccess.tsx`, `.gitignore`, `CLAUDE.md`) antes de commitar; revisão das áreas críticas (booking, auth, DTOs) | M1, M3 |
| Review | `code-simplification` | Remover RPCs redundantes (`backend/cancel-appointment-rpc.sql`, `backend/supabase/rpc_updates.sql`), artefatos de teste soltos, worktree antigo | M2 |
| Review | `security-and-hardening` | Scan de secrets, decisão sobre surfacing de erro Postgres no 500 público, rate limit do booking, DTOs sem PII | M3 |
| Review | `performance-optimization` | Bundle da página pública `/p/:slug` dentro do budget; medir antes de otimizar | M5 |
| Verify | `test-driven-development` | Suíte completa como gate de cada módulo; regressão nova ⇒ teste novo primeiro | todos |
| Verify | `browser-testing-with-devtools` / E2E | Smoke E2E do fluxo público antes do release (já existe: `e2e-booking-*.mjs`, consolidar em `web/`) | M5, M7 |
| Verify | `debugging-and-error-recovery` | Protocolo padrão durante o piloto: reproduzir → localizar → corrigir → guardar com teste | M8 |
| Build | `frontend-ui-engineering` | Polimento visual do booking público e telas de sucesso/erro (estados loading/empty/error) | M5 |
| Build | `api-and-interface-design` | Congelar contrato da API v1 (`docs/api_v1.md`) antes do piloto; mudanças passam a ser versionadas | M6 |
| Ship | `git-workflow-and-versioning` | Commits temáticos por módulo; tag de release `v1.0.0-pilot` ao final | M1–M8 |
| Ship | `ci-cd-and-automation` | Gate automatizado: build + test:unit + test:security + test:integration + scan de secrets em todo push | M6 |
| Ship | `documentation-and-adrs` | Registrar decisões (buffer zero, erro detalhado no 500, contrato congelado) e atualizar docs oficiais | M8 |
| Ship | `shipping-and-launch` | Checklist pré-lançamento, monitoramento (healthcheck, worker), plano de rollback Railway/Supabase/Expo | M8 |

**Skills não aplicáveis nesta fase:** `interview-me`, `idea-refine`, `spec-driven-development` (o produto já está especificado no `FDD.md`); `deprecation-and-migration` (única deprecação — rota `/booking/:slug` — já resolvida com redirect).

---

## 4. Tasks (checklist por módulo)

> Formato do `task.md`: checklist em branco, cada módulo termina com verificação + commit temático separado.

### M1 — Higiene do repositório

- **Purpose:** working tree limpo e sem artefatos fora de política antes de qualquer release.
- **Fonte:** `git status` atual (4 modificados + 2 untracked); `FDD.md` §7 (artefatos de teste na raiz).

- [x] revisar e commitar diff de `web/src/app/pages/booking/BookingSuccess.tsx` # 5677fae — fallback de phone hardcoded anotado para revisão no M5
- [x] revisar e commitar diffs de `.gitignore`, `CLAUDE.md`, `docs/task.md` # e9bc4ee + commit de docs da etapa
- [x] commitar `.env.example` da raiz # bba6596 — verificado: só placeholders seguros
- [x] decidir destino de `agent-skills/` (decisão §9: fora do git, apenas local) e aplicar — entrada adicionada ao `.gitignore`
- [x] mover/limpar artefatos de teste soltos na raiz # N/A — já não existem na raiz
- [x] rodar verificação de secrets # PASS — 0 sensíveis trackeados; conteúdo: só falsos positivos/placeholders
- [x] comentar e commitar # M1 concluído em 2026-06-09

### M2 — Limpeza de código legado

- **Purpose:** remover redundâncias que confundem manutenção, sem mudar comportamento.
- **Fonte:** pendências P1/P2 anotadas no fim do `task.md`.

- [x] remover `backend/cancel-appointment-rpc.sql` e `backend/supabase/rpc_updates.sql` # f759f89 — funções já promovidas a migrations numeradas; zero referências no código
- [x] descartar worktree `fix-agendamento-backend` # N/A — já não existe
- [x] `npm run build` + `npm run test:unit` no backend # tsc 0 erros + 205 passed
- [x] comentar e commitar: "chore(backend): remover RPCs avulsas redundantes" # f759f89

### M3 — Revisão de segurança

- **Purpose:** fechar as pendências de segurança antes de expor o sistema a usuários reais.
- **Fonte:** pendência do `task.md` (surfacing de erro), CLAUDE.md (política de secrets, áreas críticas).

- [ ] aplicar decisão §9: voltar ao erro genérico no 500 do endpoint público, mantendo code/message do Postgres apenas em log do servidor
- [ ] confirmar rate limit ativo no `POST /v1/public/appointments` (10/min por IP) com teste
- [ ] revisar DTOs públicos (`PublicProfessional`, `PublicService`, `PublicAppointment`) — zero PII vazada
- [ ] rodar `npm run test:security` (53 testes) e scan de secrets completo
- [ ] comentar e commitar: "fix(backend): endurecer resposta de erro pública" (se houver mudança)

### M4 — Banco e RPCs

- **Purpose:** garantir que o banco de produção tem exatamente as versões corretas das funções críticas.
- **Fonte:** pendência do `task.md` ("RPCs manuais não foram aplicadas no projeto novo").

- [ ] listar migrations numeradas e confirmar ordem (schema → migrations → seeds)
- [ ] validar no Supabase que `get_available_slots_v1` está na versão com buffer zero (commit `cdc39a5`)
- [ ] validar que `create_appointment_v1`, `cancel_appointment_v1` e `reschedule_appointment_v1` correspondem às migrations numeradas
- [ ] rodar `npm run test:integration` contra o banco validado (79 testes)
- [ ] comentar e commitar (se houver migration nova): "fix(db): alinhar RPCs do banco com migrations"

### M5 — Polimento web (produto principal: `/p/:slug`)

- **Purpose:** a página pública de booking é a porta de entrada do cliente final — deve estar impecável.
- **Fonte:** CLAUDE.md ("rota pública principal tratada como produto principal"), `FDD.md` §4.10.

- [ ] revisar estados de loading/empty/error em todas as etapas (service → datetime → client → confirm → success)
- [ ] revisar fallback de telefone hardcoded no link WhatsApp de `BookingSuccess.tsx` (mover para config ou remover fallback) # achado da revisão do M1
- [ ] confirmar redirect da rota legada `/booking/:slug` → `/p/:slug` funcionando
- [ ] medir bundle da página pública (`vite build` + análise) — só otimizar se estourar budget de landing (~150kb JS gzipped)
- [ ] rodar smoke E2E do booking público (6 cenários) contra ambiente de produção/staging
- [ ] comentar e commitar: "fix(web): polimento do booking público" (se houver mudança)

### M6 — Configuração de produção

- **Purpose:** infra configurada por env/painel, contrato congelado, gate automatizado.
- **Fonte:** P0 do CLAUDE.md (Railway com novas variáveis), seção 7 deste documento.

- [ ] conferir variáveis no Railway (backend + worker) — apenas presença/nomes, nunca valores (lista em §7.1)
- [ ] conferir allowlist CORS com os domínios reais de produção
- [ ] conferir `VITE_API_URL` no deploy da web e `BACKEND_URL` no `expoConfig.extra` do mobile (sem URLs hardcoded)
- [ ] congelar contrato da API v1: revisar `docs/api_v1.md` contra as rotas reais e marcar como oficial # corrigir refs stale para migration inexistente `20260402120000_rpc_updates.sql` (achado no M2)
- [ ] configurar CI mínimo: build + test:unit + test:security + test:integration + scan de secrets em todo push
- [ ] comentar e commitar: "ci: gate automatizado de build, testes e secrets"

### M7 — Validação fim-a-fim

- **Purpose:** provar o fluxo completo com evidência antes de aceitar usuários reais.
- **Fonte:** P1 do CLAUDE.md ("testar fluxo completo web → backend → mobile"), P0 ("WhatsApp pending se worker ativo").

- [ ] criar agendamento real via `/p/:slug` em produção (guest, sem conta)
- [ ] confirmar appointment salvo com snapshots no banco e visível na agenda mobile
- [ ] confirmar push notification recebida no device físico
- [ ] confirmar notificação WhatsApp processada pelo worker (`pending → sent`) ou `failure_reason` registrado e compreendido
- [ ] testar cancelamento e reagendamento pelo mobile, com notificações correspondentes
- [ ] registrar evidências (timestamps, ids, screenshots) no `progress.md`
- [ ] comentar e commitar: "test: validação fim-a-fim do fluxo de piloto"

### M8 — Lançamento

- **Purpose:** disponibilizar com rede de segurança: monitoramento e rollback definidos antes do primeiro usuário.
- **Fonte:** skill `shipping-and-launch`; P0/P1 do CLAUDE.md.

- [ ] escrever plano de rollback: Railway (redeploy de versão anterior), Supabase (migrations reversíveis ou backup), Expo (rollback de update OTA)
- [ ] definir monitoramento mínimo: healthcheck `GET /health`, status do worker, fila de `notifications` (pending acumulando = alerta)
- [ ] atualizar documentação oficial (`docs/`) — o que ficou oficial, o que foi removido, o que ainda precisa validação
- [ ] registrar decisões desta fase como ADRs curtos (buffer zero, erro 500, contrato congelado — ver §6.2)
- [ ] criar tag `v1.0.0-pilot` no commit de release
- [ ] iniciar piloto com grupo controlado (1–3 profissionais) antes de abrir
- [ ] comentar e commitar: "docs: documentação de lançamento e ADRs do piloto"

---

## 5. Critérios de Aceitação

A fase só está concluída quando **todos** os critérios abaixo passam, com evidência:

### 5.1 Repositório
- `git status --short` limpo (sem modificados nem untracked fora de política).
- Scan de secrets sem risco real (achados classificados: falso positivo / placeholder seguro / risco real = zero).
- Nenhum arquivo proibido versionado (`.env`, `supa-*.txt`, `*.pem`, `*.key`, artefatos de teste na raiz).

### 5.2 Backend
- `npm run build` — 0 erros.
- `npm run test:unit` (205), `npm run test:security` (53), `npm run test:integration` (79) — 100% verdes.
- RPCs do banco de produção alinhadas com as migrations numeradas (verificado, não presumido).
- Endpoint público de booking com rate limit ativo e resposta de erro sem vazamento de schema (conforme decisão do §9).

### 5.3 Web
- `npm run build` (Vite) — OK, bundle da página pública dentro do budget.
- Smoke E2E do booking público — 6/6 contra produção/staging.
- Rota legada `/booking/:slug` redirecionando para `/p/:slug`.
- Estados de loading/empty/error cobertos em todas as etapas do fluxo público.

### 5.4 Mobile
- `npx tsc --noEmit` — 0 erros; `npm test -- --runInBand` — verde.
- Push notification recebida em device físico (evidência registrada).
- Logout limpa estado sensível; nenhuma URL hardcoded.

### 5.5 Lançamento
- Healthcheck OK em produção; worker ativo processando notificações.
- 1 agendamento real criado fim-a-fim (web pública → banco → agenda mobile → push → WhatsApp) com evidência.
- Plano de rollback escrito e revisado; monitoramento mínimo definido.
- Tag `v1.0.0-pilot` criada; docs oficiais atualizadas.

---

## 6. Design e Arquitetura

### 6.1 Arquitetura vigente (referência, não duplicação)

A arquitetura está descrita no `FDD.md` §3 e em `docs/architecture.md`: Web SPA + Mobile Expo → Backend Fastify v1 (REST + DTO + Auth) → Supabase/PostgreSQL (RPC atômica + constraints GiST) + Worker (LISTEN/NOTIFY → WhatsApp/push). **Esta fase não altera arquitetura** — qualquer mudança estrutural está fora de escopo e exige novo ciclo de spec.

### 6.2 Decisões a registrar/confirmar (ADRs curtos)

| Decisão | Estado | Ação nesta fase |
|---------|--------|------------------|
| Buffer zero entre agendamentos (`get_available_slots_v1`, commit `cdc39a5`) | implementada | registrar ADR com racional (intervalo = duração do serviço) |
| Surfacing de code/message do Postgres no 500 público | implementada provisoriamente | decidir (ver §9), aplicar e registrar ADR |
| Contrato da API v1 congelado para o piloto | pendente | revisar `docs/api_v1.md`, marcar oficial, registrar ADR |
| Redirect `/booking/:slug` → `/p/:slug` (em vez de remoção) | implementada | registrar ADR (manter compatibilidade de links antigos) |

---

## 7. Integração e Configuração

> **Política (CLAUDE.md):** apenas **nomes** de variáveis neste documento. Valores só via env local ou painel do deploy. Nunca versionar `.env`.

### 7.1 Variáveis por superfície

| Superfície | Variáveis (nomes) | Onde configurar |
|------------|-------------------|------------------|
| Backend (API) | `PORT`, `NODE_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | Railway (painel) |
| Worker (notificações) | mesmas do backend + `WHATSAPP_API_URL`, `WHATSAPP_API_KEY` (opcional — default "pending"), `GEMINI_API_KEY` (opcional) | Railway (painel) |
| Web | `VITE_API_URL` | painel do deploy da web |
| Mobile | `BACKEND_URL` via `expoConfig.extra`; FCM key V1 no EAS; `googleServicesFile` no `app.json` | EAS / `app.json` |

Templates versionáveis: `.env.example` (raiz), `backend/.env.example`, `web/.env.example`, `apps/mobile/.env.example`.

### 7.2 Supabase

- Ordem de execução: **schema → migrations numeradas → seeds**.
- Validar presença e versão das RPCs: `create_appointment_v1`, `get_available_slots_v1` (buffer zero), `cancel_appointment_v1`, `reschedule_appointment_v1` (lê `blocked_slots.time_range`).
- Constraints GiST ativas em `appointments`, `blocked_slots`, `availability_rules`.
- Timezone padrão `America/Sao_Paulo`; convenção `day_of_week` 0–6.

### 7.3 Railway / Deploy

- Backend e worker como processos separados, ambos com env via painel.
- Healthcheck: `GET /health`.
- CORS: allowlist apenas com domínios reais de produção (web + booking público).
- Rate limit: `POST /v1/public/appointments` em 10/min por IP.

### 7.4 Expo / EAS

- Push validado end-to-end em device físico (2026-05-31, ver `progress.md`).
- Canal Android `agendamentos`; Expo Go e emulador ignoram push por design.
- Pendência P2 conhecida (não bloqueia piloto): retry/limpeza de push token inválido.

---

## 8. Boas Práticas

Síntese operacional das skills de Review/Ship para o dia a dia desta fase e do piloto:

### 8.1 Antes de cada commit
1. `git status --short` + `git diff --stat` — conferir que só o tema da task está no diff.
2. Verificação de secrets (comandos do CLAUDE.md) — classificar achados, nunca imprimir valores.
3. Build + suítes pertinentes ao módulo tocado.
4. Se o diff tocar auth, banco, agendamento ou env: resumir riscos explicitamente.

### 8.2 Formato de resposta com evidência
Toda task fecha no formato do CLAUDE.md: **Arquivos alterados / Comandos executados / Resultado dos testes / Riscos encontrados / Próxima ação recomendada**.

### 8.3 Red flags (failure modes do `using-agent-skills` adaptados)
- Declarar sucesso sem rodar teste ("looks right" não é evidência).
- Tocar código fora do escopo da task ("já que estou aqui…").
- Remover código/arquivo que não entende sem aprovação explícita.
- Prosseguir com palpite diante de inconsistência entre docs e código.
- Criar artefato temporário no repo e não limpar.
- Otimizar performance sem medir antes (skill `performance-optimization`: measure first).
- Esconder falha de build/teste ou normalizá-la ("sempre falhou, ignora").
- Versionar qualquer valor de secret, mesmo "só para testar".

### 8.4 Durante o piloto
- Bug reportado ⇒ `debugging-and-error-recovery`: reproduzir → localizar → corrigir → **guardar com teste de regressão**.
- Toda correção em produção passa pelo mesmo gate (build + testes + scan) antes do deploy.
- Fila de `notifications` com `pending` acumulando = investigar worker imediatamente.

---

## 9. Decisões humanas (registradas em 2026-06-09)

1. **Erro 500 público — DECIDIDO:** voltar ao genérico no endpoint público; detalhe (code/message do Postgres) apenas em log do servidor. Implementação na task M3; registrar ADR na M8.
2. **`agent-skills/` — DECIDIDO:** fica fora do repo do produto, apenas local. Aplicado: entrada `agent-skills/` adicionada ao `.gitignore`.
3. **Etapa 10 no `plan.md`/`task.md` — DECIDIDO:** sim, sincronizar em passos separados. Aplicado: Etapa 10 adicionada ao `plan.md` e o checklist correspondente ao `task.md`.

---

## 10. Referências internas

- `docs/finalizando/FDD.md` — FDD do produto (módulos, dados, workflow, validação).
- `docs/guidelines.md` — hierarquia Global → Etapa → Prompt e workflow da IA.
- `docs/plan.md` / `docs/task.md` — plano global e checklist por etapa (Etapas 0–9 concluídas).
- `docs/api_v1.md` — contrato da API a congelar.
- `docs/architecture.md` — decisões de arquitetura.
- `agent-skills/skills/using-agent-skills/SKILL.md` — mapeamento mestre de skills.
- `CLAUDE.md` — políticas de segurança, git e prioridades P0/P1/P2.
