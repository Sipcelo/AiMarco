# Plano de Desenvolvimento — AiMarco V1

> **Documento:** plano de alto nível de desenvolvimento
> **Referência principal:** `docs/finalizando/FDD.md`
> **Referências de apoio:** `architecture.md`, `modelagem_inicial_banco.md`, `roadmap.md`, `progress.md`, `api_v1.md`
> **Idioma:** Português

Este plano descreve, em alto nível, as etapas de desenvolvimento do AiMarco V1 — plataforma de agendamento para profissionais de beleza. Todas as etapas estão fundamentadas no FDD e nos documentos da pasta `docs`, sem detalhamento de código. A ordem das etapas respeita as dependências naturais do sistema: fundação → domínio → segurança → agendamento → notificações → aplicações cliente → testes → estabilização para piloto.

---

## Etapa 1 — Fundação do projeto e ambiente

Estabelecer a base técnica do monorepo e do backend descritos na arquitetura do FDD (Web, Mobile, Backend Fastify e Worker sobre Supabase/PostgreSQL), garantindo que o ambiente compile, suba e seja verificável antes de qualquer evolução de domínio.

- Organizar o monorepo nas três frentes previstas: `backend/`, `web/` e `apps/mobile/`.
- Configurar o backend Fastify + TypeScript com as camadas `routes/v1` → `lib` → `supabase`.
- Definir a estratégia de variáveis de ambiente e segredos apenas via env local/painel de deploy.
- Habilitar CORS com allowlist de origens e rate limit no endpoint público de booking.
- Validar a fundação com build e healthcheck (`/health`) antes de seguir.

## Etapa 2 — Modelagem de dados e integridade no banco

Implementar o modelo de dados e as garantias críticas de integridade que sustentam todo o produto, conforme `modelagem_inicial_banco.md` e a seção de agendamento do FDD, priorizando confiabilidade de agenda sobre complexidade.

- Criar as tabelas centrais: professionals, clients, services, availability_rules, blocked_slots, appointments e notifications.
- Implementar a RPC atômica de criação de agendamento como ponto único de gravação segura.
- Aplicar constraints de exclusão GiST para impedir overlap de appointments, blocked_slots e availability_rules.
- Garantir snapshots obrigatórios no agendamento (serviço, duração, preço opcional, nome e telefone do cliente).
- Padronizar timezone `America/Sao_Paulo` e a convenção de `day_of_week` (0–6) em todo o sistema.

## Etapa 3 — Autenticação, ownership e proteção de dados

Construir a camada de segurança do backend descrita no FDD (módulos de auth, profile e DTO), assegurando que rotas protegidas exijam token, respeitem propriedade e nunca exponham PII.

- Implementar signup/login de profissionais via Supabase Auth com validação Zod.
- Resolver o `professionalId` a partir do JWT e anexá-lo ao contexto de cada request protegido.
- Aplicar ownership check em todas as rotas privadas (`:id` deve corresponder ao dono autenticado).
- Implementar a camada DTO para separar dados públicos (sem PII) de dados do próprio profissional.
- Tratar casos de borda de autenticação: token inválido/expirado, profissional não vinculado e tokens malformados.

## Etapa 4 — Módulos de domínio do profissional

Entregar os módulos de gestão que o profissional configura antes de receber agendamentos: perfil, serviços, disponibilidade semanal e bloqueios, conforme os módulos correspondentes do FDD.

- Implementar leitura/edição de perfil, incluindo `slug`, timezone, intervalo de slot e aviso mínimo.
- Implementar o CRUD de serviços com duração, preço opcional e flag de ativo/inativo.
- Implementar as regras de disponibilidade semanal com suporte a múltiplas janelas por dia (manhã + tarde).
- Implementar criação e listagem de bloqueios pontuais com validação de início/fim.
- Garantir cálculo correto de slots livres (disponibilidade − agendamentos − bloqueios − buffer).

## Etapa 5 — Agendamento público e ciclo de vida do appointment

Implementar o coração do produto — o fluxo de agendamento guest e o ciclo de vida do agendamento — seguindo o workflow e o módulo de appointments do FDD, com recálculo final no servidor.

- Expor a superfície pública (perfil, serviços e disponibilidade) acessível por `slug`, sem PII.
- Implementar a criação de agendamento guest com recálculo de disponibilidade no momento da reserva.
- Tratar a corrida por slot simultâneo via RPC atômica + constraint, retornando erro claro de indisponibilidade.
- Implementar cancelamento, reagendamento (preservando histórico) e transições de status com ownership.
- Validar os casos de borda prioritários: horário fora da disponibilidade, slot bloqueado, serviço inativo e telefone inválido.

## Etapa 6 — Notificações assíncronas

Construir a entrega assíncrona e resiliente de notificações descrita no FDD (worker + WhatsApp + push), desacoplada da requisição de agendamento para não comprometer a confiabilidade da reserva.

- Gerar eventos de notificação no banco no momento dos eventos de agendamento (criado, cancelado, reagendado).
- Implementar o worker que escuta `LISTEN new_notification` e processa de forma concorrente segura.
- Implementar o claim atômico de notificação (`pending → processing → sent | failed`) e o reprocessamento de itens órfãos.
- Montar mensagens por `template_key` e integrar o envio via WhatsApp registrando falhas em `failure_reason`.
- Suportar o registro de push token do mobile e a entrega de avisos de novos agendamentos.

## Etapa 7 — Aplicação Web (onboarding e booking público)

Entregar as superfícies web do FDD: o onboarding guiado do profissional e a página pública de agendamento (`/p/:slug`), que é tratada como produto principal.

- Implementar o onboarding em etapas: signup → perfil → serviços → disponibilidade → conclusão.
- Implementar a página pública de booking com fluxo serviço → data/hora → dados → confirmação → sucesso.
- Espelhar no cliente as validações de domínio (telefone, slug, slot indisponível) com mensagens claras.
- Consolidar a rota pública oficial e tratar a rota legada de booking via redirect ou remoção.
- Cobrir estados de loading, vazio e erro em todo o fluxo público e de onboarding.

## Etapa 8 — Aplicação Mobile (operação do profissional)

Entregar o app Expo/React Native do FDD, focado na operação diária do profissional: sessão, onboarding, agenda e push, mobile-first conforme a arquitetura.

- Implementar login/signup, hidratação de sessão, logout limpo e tratamento global de 401.
- Implementar o onboarding mobile de perfil, serviços e disponibilidade com validação de telefone BR.
- Implementar a agenda principal com visualização do dia, navegação entre dias e métricas.
- Integrar o registro de push token e o recebimento de notificações de novos agendamentos.
- Garantir que estado sensível seja limpo no logout e que não haja URLs hardcoded.

## Etapa 9 — Testes, validação e estabilização para piloto

Consolidar a estratégia de testes e o tratamento de débito técnico do FDD para liberar o V1 a um piloto controlado, sem esconder falhas e com evidências.

- Cobrir o backend com testes unitários, de domínio, de concorrência, de integração e de segurança.
- Executar smoke E2E do fluxo público de booking e validação visual das etapas na web.
- Validar os fluxos críticos do mobile (login, logout, sessão, push, agenda) com type-check e testes.
- Resolver o débito técnico conhecido: rota de booking duplicada e artefatos de teste soltos no repositório.
- Rodar a verificação obrigatória de build/testes e a checagem de segredos antes de declarar o V1 pronto.

## Etapa 10 — Polimento e lançamento do piloto

Preparar a disponibilização real do V1 conforme `docs/finalizando/polimento-e-lancamento-fdd.md` (módulos M1–M8), usando o pipeline de skills Review → Verify → Ship: higiene do repositório, limpeza de legado, endurecimento de segurança, alinhamento do banco, polimento do booking público, configuração de produção, validação fim-a-fim e lançamento controlado.

- Limpar o working tree (diffs pendentes, artefatos soltos) e remover código legado redundante (RPCs avulsas, worktree antigo).
- Endurecer a resposta de erro do endpoint público (500 genérico; detalhe só em log) e revalidar rate limit e DTOs sem PII.
- Validar que as RPCs do banco de produção correspondem às migrations numeradas e que a ordem schema → migrations → seeds está documentada.
- Polir a página pública `/p/:slug` (estados de loading/vazio/erro, redirect da rota legada, budget de bundle) com smoke E2E verde.
- Configurar produção (Railway, CORS, env por painel), congelar o contrato da API v1 e estabelecer gate de CI (build + testes + scan de segredos).
- Validar o fluxo completo com evidência (booking público → banco → agenda mobile → push → WhatsApp) e lançar com monitoramento, plano de rollback e tag `v1.0.0-pilot`.
