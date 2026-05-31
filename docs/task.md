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

- [ ] implementar login/signup, hidratação de sessão, logout limpo e tratamento global de 401
- [ ] implementar onboarding mobile (perfil, serviços, disponibilidade) com validação de telefone BR
- [ ] implementar agenda principal (visão do dia, navegação entre dias, métricas)
- [ ] integrar registro de push token e recebimento de notificações
- [ ] garantir limpeza de estado sensível no logout e ausência de URLs hardcoded
- [ ] verificar tipos do mobile (npx tsc --noEmit em apps/mobile)
- [ ] comentar e commitar: "feat(mobile): sessão, onboarding, agenda e push"

## Etapa 9: Testes, validação e estabilização para piloto

- [ ] cobrir backend com testes unitários, de domínio, de concorrência, de integração e de segurança
- [ ] executar smoke E2E do fluxo público de booking na web
- [ ] validar fluxos críticos do mobile (login, logout, sessão, push, agenda)
- [ ] resolver débito técnico: rota de booking duplicada e artefatos de teste soltos no repositório
- [ ] rodar verificação de segredos antes de declarar o V1 pronto
- [ ] npm run build
- [ ] npm run test:unit
- [ ] npm run test:security
- [ ] npm run test:integration
- [ ] comentar e commitar: "test: estabilização final e validação para piloto V1"
