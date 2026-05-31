# Tarefas de Implementação — AiMarco V1

> **Base:** `docs/plan.md` (derivado de `docs/finalizando/FDD.md`)
> **Como usar:** checklist em branco — marque `- [x]` ao concluir cada tarefa
> **Convenção:** cada etapa é comentada e commitada separadamente (commits pequenos, sem misturar temas)
> **Comandos executados a partir de:** `backend/` (onde estão os scripts `build`, `test:unit`, `test:security`, `test:integration`)

---

## Etapa 0: Preparação e leitura de contexto

- [ ] ler @docs/
- [ ] confirmar estrutura do monorepo: backend/, web/, apps/mobile/
- [ ] instalação limpa de dependências do backend (npm ci)
- [ ] ignorar backend/supabase/.temp/ # ignorado (artefato temporário)
- [ ] ignorar backend/.env # fora do git (segredo)
- [ ] rodar verificação de segredos antes de iniciar (git ls-files + grep de secrets)
- [ ] npm run build
- [ ] npm run test:unit
- [ ] comentar e commitar: "chore: preparar ambiente e validar baseline"

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

- [ ] implementar signup/login de profissionais via Supabase Auth com validação Zod
- [ ] resolver professionalId a partir do JWT e anexar ao contexto do request
- [ ] aplicar ownership check em todas as rotas privadas
- [ ] implementar camada DTO separando dados públicos (sem PII) de dados do próprio profissional
- [ ] tratar bordas de auth: token inválido/expirado, profissional não vinculado, token malformado
- [ ] npm run build
- [ ] npm run test:security
- [ ] comentar e commitar: "feat(auth): autenticação, ownership e camada DTO"

## Etapa 4: Módulos de domínio do profissional

- [ ] implementar leitura/edição de perfil (slug, timezone, intervalo de slot, aviso mínimo)
- [ ] implementar CRUD de serviços (duração, preço opcional, ativo/inativo)
- [ ] implementar regras de disponibilidade semanal com múltiplas janelas por dia
- [ ] implementar criação e listagem de bloqueios com validação de início/fim
- [ ] implementar cálculo de slots livres (disponibilidade − agendamentos − bloqueios − buffer)
- [ ] npm run build
- [ ] npm run test:unit
- [ ] comentar e commitar: "feat(backend): perfil, serviços, disponibilidade e bloqueios"

## Etapa 5: Agendamento público e ciclo de vida do appointment

- [ ] expor superfície pública (perfil, serviços, disponibilidade) por slug, sem PII
- [ ] implementar criação de agendamento guest com recálculo de disponibilidade no servidor
- [ ] tratar corrida por slot simultâneo via RPC atômica + constraint (erro claro de indisponibilidade)
- [ ] implementar cancelamento, reagendamento (preservando histórico) e transições de status com ownership
- [ ] validar bordas: horário fora da disponibilidade, slot bloqueado, serviço inativo, telefone inválido
- [ ] npm run build
- [ ] npm run test:unit
- [ ] npm run test:integration
- [ ] comentar e commitar: "feat(appointments): booking público e ciclo de vida do agendamento"

## Etapa 6: Notificações assíncronas

- [ ] gerar eventos de notificação no banco (agendamento criado, cancelado, reagendado)
- [ ] implementar worker que escuta LISTEN new_notification com concorrência segura
- [ ] implementar claim atômico (pending → processing → sent | failed) e reprocessamento de órfãos
- [ ] montar mensagens por template_key e integrar envio WhatsApp registrando failure_reason
- [ ] suportar registro de push token do mobile e entrega de avisos de novos agendamentos
- [ ] npm run build
- [ ] npm run test:integration
- [ ] comentar e commitar: "feat(notifications): worker assíncrono, whatsapp e push token"

## Etapa 7: Aplicação Web (onboarding e booking público)

- [ ] implementar onboarding em etapas: signup → perfil → serviços → disponibilidade → conclusão
- [ ] implementar página pública de booking (/p/:slug): serviço → data/hora → dados → confirmação → sucesso
- [ ] espelhar no cliente as validações de domínio (telefone, slug, slot indisponível)
- [ ] consolidar rota pública oficial e tratar rota legada de booking (redirect ou remoção)
- [ ] cobrir estados de loading, vazio e erro no fluxo público e de onboarding
- [ ] npm run build
- [ ] comentar e commitar: "feat(web): onboarding do profissional e booking público"

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
