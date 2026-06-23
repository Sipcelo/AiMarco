# M8 — Lançamento do piloto

> Módulo final de `docs/finalizando/polimento-e-lancamento-fdd.md`. Cobre plano de rollback,
> monitoramento mínimo, ADRs da fase e tag de release.

## 1. Plano de rollback

### Backend + Worker (Railway)

API e worker rodam no mesmo container (`Dockerfile` raiz, `CMD ["npm","start"]`, commit `528f6a6`).

- Rollback = redeploy do deployment anterior pelo painel Railway ("Deployments" → escolher build
  anterior → "Redeploy"), ou `git revert` do commit problemático seguido de push (Railway redeploya
  automaticamente em push na branch conectada).
- Sem migration de banco envolvida no commit → rollback é seguro e imediato (segundos).
- Se o commit problemático incluir migration nova, ver subseção "Banco" abaixo antes de redeploy.

### Banco (Supabase)

- Migrations em `backend/supabase/migrations/` são aditivas (CREATE/ALTER), não há `DROP TABLE`
  destrutivo no histórico atual.
- Rollback de migration = escrever migration reversa específica (ex.: `DROP FUNCTION` para uma RPC
  nova, `ALTER TABLE ... DROP COLUMN` para coluna nova) — não existe ferramenta de auto-down neste
  projeto (decisão deliberada: simplicidade do V1).
- Antes de qualquer migration em produção: confirmar backup automático do Supabase ativo (painel
  Database → Backups) e anotar o ponto-no-tempo antes de aplicar.
- Se uma RPC nova quebrar o app: reverter apenas a função (`CREATE OR REPLACE FUNCTION` com o corpo
  anterior, recuperável via `git show <commit_anterior>:caminho/migration.sql`), não a tabela.

### Web (deploy estático)

- Build Vite gerado a partir do mesmo commit do backend (mesmo `Dockerfile`, estágio `web-builder`).
- Rollback = mesmo redeploy do Railway citado acima (frontend é servido pela própria API a partir
  de `/app/public`).

### Mobile (Expo)

- **Achado:** o app **não tem `expo-updates` configurado** (sem `runtimeVersion`/`updates.url` em
  `app.json`, sem a dependência `expo-updates` em `package.json`). Não há canal OTA ativo — cada
  build (`eas build`) é um APK/AAB fechado, instalado manualmente ou distribuído via loja.
- Rollback real disponível: reinstalar o build anterior do EAS (`eas build:list` → localizar build
  estável anterior → reinstalar o APK no device, ou reverter o release na Play Store se já publicado).
- OTA rollback citado no `task.md` original não se aplica ao estado atual do projeto — corrigido
  aqui como achado, não implementado nesta fase (fora de escopo: adicionar `expo-updates` seria
  nova funcionalidade, não polimento).

## 2. Monitoramento mínimo

**Endpoint automatizado (P1):** `GET /health/ready` (`backend/src/app.ts`) — feito para um monitor de
uptime externo (UptimeRobot/Better Stack) apontando para
`https://aimarco.up.railway.app/health/ready`, alertando em **qualquer resposta não-200**. Um único
monitor cobre os 3 modos de falha do piloto:
- **API caiu** → sem resposta (timeout) → alerta.
- **DB fora** → `503` `{db:"error"|"unreachable"}`.
- **Worker morto/travado** → `503` `{status:"degraded", stuck_notifications:N}` quando há notifications
  presas em `pending`/`processing` há mais de 5 min (worker saudável processa em ms).

Resposta saudável: `200 {status:"ok", db:"ok", stuck_notifications:0}`. Sem PII/segredo no corpo
(apenas contagem).

> `GET /health` (sem `/ready`) permanece como **liveness barato** usado pelo Railway — só prova que o
> HTTP está no ar. Não usar `/health` para o monitor externo: ele não vê DB nem worker.

**Complementos manuais:**
- **Worker (log):** Railway deve mostrar `Worker connected to database.` e
  `Worker listening for new_notification...` após cada deploy. Ausência = worker não subiu (achado M7).
- **Inspeção pontual:** `select status, count(*) from notifications group by status;` para detalhar
  (`failed` com `failure_reason`, etc.). `pending` acumulando = worker parado ou `LISTEN/NOTIFY`
  quebrado (ex.: `DATABASE_URL` no Transaction pooler 6543, que não suporta `LISTEN`).
- Sem ferramenta de observabilidade dedicada (Sentry/Grafana) nesta fase — candidato a P2 pós-piloto.

## 3. ADRs da fase (decisões a registrar)

### ADR-1: Buffer zero entre agendamentos

- **Decisão:** `get_available_slots_v1` usa `v_buffer_minutes := 0` (migration
  `20260601000002_availability_zero_buffer.sql`).
- **Racional:** o intervalo entre agendamentos já é a duração do próprio serviço (`service_duration_minutes`);
  buffer adicional duplicava o espaçamento e reduzia slots disponíveis sem necessidade real reportada
  pelos profissionais piloto.
- **Status:** implementada e confirmada byte-a-byte no banco de produção (M6).

### ADR-2: Erro 500 genérico na API pública

- **Decisão:** o endpoint público de booking nunca devolve `code`/`message` do Postgres ao cliente;
  erro completo vai só para `console.error` no servidor.
- **Racional:** evitar vazamento de schema/detalhes internos do banco para usuários anônimos
  (superfície de ataque desconhecida).
- **Status:** implementada (commit `9a7df24`).

### ADR-3: Contrato da API v1 congelado

- **Decisão:** `docs/api_v1.md` é o contrato oficial do piloto. RPCs `_v2` documentadas em versão
  anterior do doc nunca foram implementadas (migration `20260402180000_contract_v2.sql` não existe)
  — marcadas como não implementadas, não removidas do histórico de decisão.
- **Racional:** evitar quebra de contrato durante o piloto; qualquer mudança de API exige nova
  versão explícita, não edição silenciosa do v1.
- **Status:** implementada (commit `6313852`).

### ADR-4: Redirect de rota legada em vez de remoção

- **Decisão:** `/booking/:slug` redireciona (`replace`) para `/p/:slug` em vez de ser removida.
- **Racional:** preservar links antigos já compartilhados (WhatsApp, redes sociais) sem 404.
- **Status:** implementada (`web/src/app/Router.tsx`, `LegacyBookingRedirect`).

### ADR-5: Rate limit devolvia 500 em vez de 429 (bug corrigido nesta fase)

- **Decisão:** `errorResponseBuilder` do plugin de rate limit precisa propagar `context.statusCode`
  explicitamente; sem isso, o Fastify cai no default 500 ao exceder o limite.
- **Racional:** bug encontrado pelo teste novo de rate limit (M3); resposta correta (429) é exigida
  por qualquer cliente/biblioteca que trate retry com backoff.
- **Status:** corrigida (commit `8e740ba`).

### ADR-6: WhatsApp via Evolution API desativado no piloto

- **Decisão:** `WHATSAPP_API_URL="pending"` propositalmente — Evolution API não está habilitada.
- **Racional:** decisão pendente entre Evolution (risco de ban do número) vs API oficial WhatsApp
  Business (custo/burocracia); piloto roda sem confirmação automática por WhatsApp, apenas push.
- **Status:** comportamento controlado e testado (M7) — falha registrada com `failure_reason` claro,
  sem crash do worker.

## 4. Estado da documentação oficial

- `docs/api_v1.md` — oficial, contrato congelado (M6).
- `docs/task.md` / `docs/progress.md` — refletem estado real até M7; este documento fecha M8.
- `docs/finalizando/` — artefatos de planejamento da fase de polimento (FDD, roteiro M7, este doc);
  mantidos como histórico, não como documentação operacional contínua.
- Reorganização para a estrutura `docs/00-status-atual.md`...`07-debito-tecnico.md` sugerida no
  `CLAUDE.md` **não foi feita nesta fase** — é reorganização, não polimento do piloto; candidato a
  tarefa própria pós-piloto.

## 5. Tag de release

- `v1.0.0-pilot` criada no commit que fecha este módulo (ver `git log` / `git tag`).
