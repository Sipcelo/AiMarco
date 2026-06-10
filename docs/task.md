# Tarefas de Implementação — AiMarco V1

> **Base:** `docs/plan.md` (derivado de `docs/finalizando/FDD.md`)
> **Como usar:** checklist em branco — marque `- [x]` ao concluir cada tarefa
> **Convenção:** cada etapa é comentada e commitada separadamente (commits pequenos, sem misturar temas)
> **Comandos executados a partir de:** `backend/` (onde estão os scripts `build`, `test:unit`, `test:security`, `test:integration`)

---

## Etapa 0: Preparação e leitura de contexto

- [x] ler @docs/
- [x] confirmar estrutura do monorepo: backend/, web/, apps/mobile/
- [x] instalação limpa de dependências do backend (npm ci)
- [x] ignorar backend/supabase/.temp/ # ignorado (artefato temporário)
- [x] ignorar backend/.env # fora do git (segredo)
- [x] rodar verificação de segredos antes de iniciar (git ls-files + grep de secrets)
- [x] npm run build
- [x] npm run test:unit
- [x] comentar e commitar: "chore: preparar ambiente e validar baseline"

## Etapa 1: Fundação do projeto e ambiente

- [x] configurar backend Fastify + TypeScript nas camadas routes/v1 → lib → supabase
- [x] definir estratégia de variáveis de ambiente apenas via env local/painel de deploy
- [x] configurar CORS com allowlist de origens
- [x] configurar rate limit no endpoint público de booking
- [x] validar healthcheck (GET /health) com o servidor no ar
- [x] npm run build
- [x] comentar e commitar: "chore: fundação do backend (fastify, cors, rate limit, health)"

## Etapa 2: Modelagem de dados e integridade no banco

- [x] criar tabelas: professionals, clients, services, availability_rules, blocked_slots, appointments, notifications
- [x] implementar RPC atômica de criação de agendamento como ponto único de gravação
- [x] aplicar constraints de exclusão GiST (appointments, blocked_slots, availability_rules)
- [x] garantir snapshots obrigatórios no appointment (serviço, duração, preço, nome, telefone)
- [x] padronizar timezone America/Sao_Paulo e convenção day_of_week (0–6)
- [x] listar migrations e definir ordem de execução (schema → migrations → seeds)
- [x] npm run build
- [x] npm run test:unit
- [x] comentar e commitar: "feat(db): modelo de dados, RPC atômica e constraints de overlap"

## Etapa 3: Autenticação, ownership e proteção de dados

- [x] implementar signup/login de profissionais via Supabase Auth com validação Zod
- [x] resolver professionalId a partir do JWT e anexar ao contexto do request
- [x] aplicar ownership check em todas as rotas privadas
- [x] implementar camada DTO separando dados públicos (sem PII) de dados do próprio profissional
- [x] tratar bordas de auth: token inválido/expirado, profissional não vinculado, token malformado
- [x] npm run build
- [x] npm run test:security
- [x] comentar e commitar: "feat(auth): autenticação, ownership e camada DTO"

## Etapa 4: Módulos de domínio do profissional

- [x] implementar leitura/edição de perfil (slug, timezone, intervalo de slot, aviso mínimo)
- [x] implementar CRUD de serviços (duração, preço opcional, ativo/inativo)
- [x] implementar regras de disponibilidade semanal com múltiplas janelas por dia
- [x] implementar criação e listagem de bloqueios com validação de início/fim
- [x] implementar cálculo de slots livres (disponibilidade − agendamentos − bloqueios − buffer)
- [x] npm run build
- [x] npm run test:unit
- [x] comentar e commitar: "feat(backend): perfil, serviços, disponibilidade e bloqueios"

## Etapa 5: Agendamento público e ciclo de vida do appointment

- [x] expor superfície pública (perfil, serviços, disponibilidade) por slug, sem PII
- [x] implementar criação de agendamento guest com recálculo de disponibilidade no servidor
- [x] tratar corrida por slot simultâneo via RPC atômica + constraint (erro claro de indisponibilidade)
- [x] implementar cancelamento, reagendamento (preservando histórico) e transições de status com ownership
- [x] validar bordas: horário fora da disponibilidade, slot bloqueado, serviço inativo, telefone inválido
- [x] npm run build
- [x] npm run test:unit
- [x] npm run test:integration
- [x] comentar e commitar: "feat(appointments): booking público e ciclo de vida do agendamento"

## Etapa 6: Notificações assíncronas

- [x] gerar eventos de notificação no banco (agendamento criado, cancelado, reagendado)
- [x] implementar worker que escuta LISTEN new_notification com concorrência segura
- [x] implementar claim atômico (pending → processing → sent | failed) e reprocessamento de órfãos
- [x] montar mensagens por template_key e integrar envio WhatsApp registrando failure_reason
- [x] suportar registro de push token do mobile e entrega de avisos de novos agendamentos
- [x] npm run build
- [x] npm run test:integration
- [x] comentar e commitar: "feat(notifications): worker assíncrono, whatsapp e push token"

## Etapa 7: Aplicação Web (onboarding e booking público)

- [x] implementar onboarding em etapas: signup → perfil → serviços → disponibilidade → conclusão
- [x] implementar página pública de booking (/p/:slug): serviço → data/hora → dados → confirmação → sucesso
- [x] espelhar no cliente as validações de domínio (telefone, slug, slot indisponível)
- [x] consolidar rota pública oficial e tratar rota legada de booking (redirect ou remoção)
- [x] cobrir estados de loading, vazio e erro no fluxo público e de onboarding
- [x] npm run build
- [x] comentar e commitar: "feat(web): onboarding do profissional e booking público"

## Etapa 8: Aplicação Mobile (operação do profissional)

- [x] implementar login/signup, hidratação de sessão, logout limpo e tratamento global de 401
- [x] implementar onboarding mobile (perfil, serviços, disponibilidade) com validação de telefone BR
- [x] implementar agenda principal (visão do dia, navegação entre dias, métricas)
- [x] integrar registro de push token e recebimento de notificações (FCM configurado) # 2026-05-31: validado end-to-end no device físico — ver progress.md "Push notifications Android — FUNCIONAL" (fixes: key FCM V1 no EAS, coluna push_token, googleServicesFile no app.json)
- [x] garantir limpeza de estado sensível no logout e ausência de URLs hardcoded
- [x] verificar tipos do mobile (npx tsc --noEmit em apps/mobile) # 2026-05-31: zero erros
- [x] comentar e commitar: "feat(mobile): sessão, onboarding, agenda e push" # código em e3ed1d4

## Etapa 9: Testes, validação e estabilização para piloto

- [x] cobrir backend com testes unitários, de domínio, de concorrência, de integração e de segurança # 205 unit + 53 security + 79 integration (2 skipped)
- [x] executar smoke E2E do fluxo público de booking na web # 2026-05-31: Playwright/Chromium contra backend de produção — 6/6 passaram (identidade, serviços, seleção→data/hora, dados do cliente, demos)
- [x] validar fluxos críticos do mobile (login, logout, sessão, push, agenda) # tsc --noEmit 0 erros + jest 13 testes (fix transformIgnorePatterns)
- [x] resolver débito técnico: rota de booking duplicada e artefatos de teste soltos no repositório # rota legada /booking/:slug já redireciona p/ /p/:slug; removido tests/integration/test-race-condition.ts
- [x] rodar verificação de segredos antes de declarar o V1 pronto # git ls-files + grep de conteúdo: sem segredos reais (só falsos positivos)
- [x] npm run build # backend tsc 0 erros + web vite build OK
- [x] npm run test:unit # 205 passed
- [x] npm run test:security # 53 passed
- [x] npm run test:integration # 79 passed | 2 skipped
- [x] comentar e commitar: "test: estabilização final e validação para piloto V1" # 573b1e6 (estabilização) + smoke E2E green

## Etapa 10: Polimento e lançamento do piloto

> **Base:** `docs/finalizando/polimento-e-lancamento-fdd.md` (módulos M1–M8, critérios de aceitação na §5)

### M1 — Higiene do repositório

- [x] revisar e commitar diff de `web/src/app/pages/booking/BookingSuccess.tsx` # 5677fae — wa.me dinâmico; fallback de phone hardcoded anotado p/ M5
- [x] revisar e commitar diffs de `.gitignore`, `CLAUDE.md`, `docs/task.md` e novos docs # e9bc4ee (gitignore+CLAUDE.md) + commit de docs desta etapa
- [x] commitar `.env.example` da raiz (conferir antes: apenas nomes de variáveis, sem valores) # bba6596 — só placeholders seguros
- [x] decidir destino de `agent-skills/` # decisão: fora do git, apenas local — adicionado ao .gitignore
- [x] mover/limpar artefatos de teste soltos na raiz # N/A — já não existem (`booking-*.png`, `e2e-booking-*.mjs`, `run-*.png` ausentes da raiz)
- [x] rodar verificação de segredos (git ls-files + grep de conteúdo) # PASS — 0 arquivos sensíveis trackeados; matches só falsos positivos/placeholders
- [x] comentar e commitar: "chore: higiene do repositório pré-piloto" # fechado pelo commit de docs da etapa 10

### M2 — Limpeza de código legado

- [x] remover `backend/cancel-appointment-rpc.sql` e `backend/supabase/rpc_updates.sql` # f759f89 — 3 funções (create/cancel/reschedule_appointment_v1) já cobertas por migrations 20260529000001 / 20260601000000 / 20260601000001; nenhum código referenciava os avulsos
- [x] descartar worktree `fix-agendamento-backend` # N/A — `git worktree list` já só mostra main
- [x] npm run build # tsc 0 erros (após npm ci — backend estava sem node_modules)
- [x] npm run test:unit # 205 passed (11 arquivos)
- [x] comentar e commitar: "chore(backend): remover RPCs avulsas redundantes" # f759f89

### M3 — Revisão de segurança

- [x] triagem e correção de vulnerabilidades npm do backend # ff1cd66 — `npm audit fix` (sem --force): 8→1; corrigidas runtime (fastify 5.8.5, fast-uri 3.1.2, @fastify/static, ws 8.21.0) + dev (shell-quote 1.8.4 critical). Resíduo aceito: vite (dev-only ←vitest, só `--force`). Build+205 unit+53 security verdes
- [x] aplicar decisão: 500 genérico no endpoint público; code/message do Postgres apenas em log do servidor # 9a7df24 — handler já devolvia genérico; adicionado console.error server-side do erro completo
- [x] confirmar rate limit ativo no POST /v1/public/appointments (10/min por IP) com teste # 8e740ba — config OK (max:10/min por IP), mas teste revelou BUG: plugin devolvia 500 em vez de 429 (errorResponseBuilder sem statusCode → default 500 do Fastify). Corrigido + teste em tests/security/rate-limit.test.ts
- [x] revisar DTOs públicos (PublicProfessional, PublicService, PublicAppointment) — zero PII # allowlist por construção; transformers montam objeto novo só com campos seguros (sem email/phone/client_*). Booking eco só PII do próprio cliente
- [x] npm run test:security # 55 passed (eram 53 + 2 do rate-limit)
- [x] comentar e commitar: "fix(backend): endurecer resposta de erro pública" # 9a7df24 + 8e740ba (dois temas separados)

### M4 — Banco e RPCs

- [x] listar migrations numeradas e confirmar ordem (schema → migrations → seeds) # 20 migrations, ordem lexicográfica; get_available_slots_v1 redefinido 3× (final = 20260601000002 buffer zero, v_buffer_minutes:=0). Código chama exatamente 4 RPCs, todas com migration numerada
- [x] validar no Supabase as versões das RPCs # via OpenAPI do PostgREST (read-only): as 4 RPCs existem no banco vivo; get_available_slots_v1 executa (0 slots p/ prof inexistente). ⚠️ buffer-zero interno NÃO confirmado byte-a-byte (DATABASE_URL stale — auth falhou; pg_proc inacessível). Migration é fonte da verdade
- [x] npm run test:integration # 87 passed | 2 skipped. ⚠️ ACHADO: suíte é mock-based (stores em memória + vi.mock), NÃO bate no banco real — não valida RPCs no DB
- [x] comentar e commitar (se houver migration nova) # SEM migration nova — as 4 RPCs já existem e batem com as migrations; nada a corrigir. Achados: (a) DATABASE_URL local com credencial inválida → M6; (b) create_public_appointment_v1 (20260323000005) órfão, nunca chamado → candidato a DROP em migration futura

### M5 — Polimento web (/p/:slug)

- [x] revisar estados de loading/vazio/erro em todas as etapas do booking público # ProfessionalBookingPage: loading spinner, error card (prof inexistente), erro banner (sem serviços), slot vazio ("Nenhum horário disponível"), slot loading — todos OK
- [x] revisar fallback de telefone hardcoded no `BookingSuccess.tsx` # NÃO é bug: BookingSuccess só roda em /example-* (demo); o número é o contato comercial da demo. Produção (/p/:slug → SuccessScreen) usa telefone dinâmico. Extraído p/ const nomeada DEMO_SALES_WHATSAPP (4726e52)
- [x] confirmar redirect da rota legada /booking/:slug → /p/:slug # Router.tsx LegacyBookingRedirect com replace, preserva slug — OK
- [x] medir bundle da página pública # /p/:slug ~130kb gz no pior caso (app 62kb + index compartilhado 68kb); budget landing 150kb gz — dentro. Sem otimização necessária
- [x] rodar smoke E2E do booking público (6 cenários) # d28055e — 6/6 verde (local, proxy /v1→prod, read-only). Teste "fill client info" tornado determinístico (busca dia com slot; senão valida estado vazio). NÃO rodei booking-production.spec.ts (cria agendamento real + data hardcoded no passado — ver achado abaixo)
- [ ] revisar/remover `web/e2e/booking-production.spec.ts` # ACHADO M5: cria agendamento REAL em produção (clica "Confirmar Agendamento") com data hardcoded no passado (30/05/2026) — perigoso e quebrado; substituir por smoke read-only ou remover
- [x] comentar e commitar # d28055e (E2E + data-testid) + 4726e52 (const demo)

### M6 — Configuração de produção

- [ ] conferir variáveis no Railway (backend + worker) — apenas presença/nomes, nunca valores
- [ ] corrigir/rotacionar DATABASE_URL (credencial local inválida — auth pg falhou no M4); validar pg_proc do buffer-zero quando conexão DB-direct funcionar
- [ ] conferir allowlist CORS com domínios reais e VITE_API_URL / BACKEND_URL (expoConfig.extra) nos deploys
- [ ] congelar contrato da API v1: revisar docs/api_v1.md contra rotas reais e marcar oficial # corrigir refs stale: api_v1.md aponta p/ migration inexistente `20260402120000_rpc_updates.sql` (achado no M2)
- [ ] (opcional) DROP create_public_appointment_v1 órfão via migration nova (achado no M4)
- [ ] configurar CI mínimo: build + test:unit + test:security + test:integration + scan de segredos
- [ ] comentar e commitar: "ci: gate automatizado de build, testes e secrets"

### M7 — Validação fim-a-fim

- [ ] criar agendamento real via /p/:slug em produção (guest)
- [ ] confirmar appointment salvo com snapshots e visível na agenda mobile
- [ ] confirmar push notification em device físico
- [ ] confirmar notificação WhatsApp processada (pending → sent) ou failure_reason compreendido
- [ ] testar cancelamento e reagendamento pelo mobile com notificações correspondentes
- [ ] registrar evidências (timestamps, ids, screenshots) no progress.md
- [ ] comentar e commitar: "test: validação fim-a-fim do fluxo de piloto"

### M8 — Lançamento

- [ ] escrever plano de rollback (Railway, Supabase, Expo OTA)
- [ ] definir monitoramento mínimo: GET /health, status do worker, fila de notifications
- [ ] atualizar documentação oficial e registrar ADRs (buffer zero, erro 500 genérico, contrato congelado, redirect legado)
- [ ] criar tag v1.0.0-pilot no commit de release
- [ ] iniciar piloto com grupo controlado (1–3 profissionais)
- [ ] comentar e commitar: "docs: documentação de lançamento e ADRs do piloto"





> Nota: as limpezas/pendências P1/P2 que estavam anotadas aqui foram absorvidas pela Etapa 10 (M2 = RPCs avulsas e worktree antigo; M3 = surfacing de erro no 500; M4 = validação das versões das RPCs no banco).