# AiMarco - learn.md

## 1. Purpose

This document stores the main lessons learned during the development of AiMarco.

It should capture:
- product lessons
- architecture lessons
- implementation lessons
- workflow lessons
- AI usage lessons

The goal is to avoid repeating mistakes and to preserve useful project knowledge over time.

## 2. Core learning philosophy

AiMarco is being built with a disciplined AI-assisted workflow.

This means:
- architecture comes before implementation
- domain rules come before UI
- documentation comes before automation
- the human defines structure and decisions
- the AI helps execute within constraints

The project should be treated as a learning system, not just a codebase.

## 3. Product lessons

### 3.1 Narrow scope creates better clarity
Defining the initial niche as:
- barbershops
- nails
- hair

made the product much clearer.

Instead of building a generic scheduling platform, the project now has:
- a stronger target user
- clearer booking flows
- simpler rules
- better V1 boundaries

### 3.2 V1 must be strong, not large
A strong V1 is not a feature-heavy V1.

A strong V1 means:
- reliable booking rules
- clear scope
- simple user flow
- stable technical foundation

### 3.3 One agenda per professional simplifies everything
Choosing one schedule per professional in V1 greatly reduces complexity in:
- data modeling
- API design
- validation rules
- mobile flow
- schedule visualization

### 3.4 Guest booking reduces friction
Removing mandatory customer accounts helps:
- reduce booking friction
- make V1 simpler
- focus on the actual scheduling problem

## 4. Architecture lessons

### 4.1 Schedule logic is the real core
The system is not mainly about screens.
It is mainly about:
- availability rules
- blocked slots
- service duration
- no-overlap guarantees
- rescheduling integrity

### 4.2 Availability and blocked slots must stay separate
These are different concepts and must not be merged.

- availability_rules define recurring working hours
- blocked_slots define one-off unavailable windows

Mixing them would create confusion and fragile logic.

### 4.3 Snapshots are necessary
Appointments must store snapshots of important values.

This protects history when:
- a service changes
- a client changes
- a price changes later
- a name changes later

### 4.4 Rescheduling should preserve traceability
Rescheduling should not overwrite the original appointment.

It should be handled as:
- cancel old appointment
- create new appointment
- keep linkage between both

## 5. Workflow lessons

### 5.1 Clean environment matters
Creating the Docker environment first was the correct move.

It helped:
- isolate the project
- avoid host contamination
- create a safer terminal-agent workflow
- align with the AI jail idea

### 5.2 Project root hygiene matters
Cleaning the root folder was necessary.
A messy root creates confusion for:
- the human
- the AI agent
- future documentation
- implementation structure

### 5.3 Expo Router simplifies file-based routing
Initially the mobile screens were in `src/screens/` with manual navigation.
Migrating to Expo Router's `app/` directory structure:
- Eliminated manual Navigator components
- Enabled file-based routing with groups
- Made conditional routing (AuthGuard) trivial with `useSegments` + `useRouter`
- Reduced boilerplate significantly
- Future: deep linking becomes automatic

### 5.4 PowerShell should be the default on Windows
Using PowerShell as the standard local shell is more reliable for this project and reduces command confusion in the Windows environment.

### 5.5 English docs reduce friction
Writing technical project files in English is better for:
- terminal agents
- consistency
- encoding stability
- technical readability

## 6. AI usage lessons

### 6.1 The AI needs boundaries
Without explicit constraints, an AI agent tends to:
- add scope
- assume features
- invent structure
- optimize for speed instead of correctness

### 6.2 Documentation is operational context
Files like:
- GEMINI.md
- CLAUDE.md
- architecture.md
- roadmap.md

are not just notes.
They are part of the execution system.

### 6.3 The human must stay in the architect role
The human should define:
- scope
- architecture
- business rules
- implementation order
- acceptance criteria

The AI should execute, not lead product direction.

### 6.4 Documentation-first reduces rework
Writing the project structure and rules before coding reduces:
- ambiguity
- bad assumptions
- random implementation
- refactoring caused by missing context

## 7. Current confirmed lessons

At this stage, the most important confirmed lessons are:
- niche focus improves decision quality
- scheduling logic is more important than UI speed
- Docker first was the right call
- project root hygiene matters
- PowerShell should be the default local shell
- English technical docs are better for this workflow
- documentation-first is worth the time

## 8. Open questions to validate in practice

These are things that still need real validation later:
- whether 30 minutes is the best minimum booking notice
- whether 2 hours is the best cancellation/reschedule notice
- whether confirmation-on-screen is enough for the first tester cycle
- whether the weekly view needs simplification for real users
- whether blocked slot creation needs to be faster in the mobile flow

## 9. Rule for future updates

This document should be updated whenever:
- a mistake is discovered
- a better pattern is validated
- a product assumption changes
- a technical workflow proves useful
- a repeated problem is identified

The goal is to turn project experience into reusable knowledge.

---

## 🇧🇷 Versão em Português

## 1. Propósito

Este documento armazena as principais lições aprendidas durante o desenvolvimento do AiMarco.

Deve capturar:
- lições de produto
- lições de arquitetura
- lições de implementação
- lições de fluxo de trabalho
- lições de uso de IA

O objetivo é evitar repetir erros e preservar conhecimento útil do projeto ao longo do tempo.

## 2. Filosofia de aprendizado central

AiMarco está sendo construído com um fluxo de trabalho disciplinado assistido por IA.

Isso significa:
- arquitetura antes de implementação
- regras de domínio antes de UI
- documentação antes de automação
- o humano define estrutura e decisões
- a IA ajuda executar dentro de restrições

O projeto deve ser tratado como um sistema de aprendizagem, não apenas um codebase.

## 3. Lições de produto

### 3.1 Escopo estreito cria melhor clareza

Definir o nicho inicial como:
- barbearias
- unhas
- cabelo

tornou o produto muito mais claro.

Em vez de construir uma plataforma de agendamento genérica, o projeto agora tem:
- um alvo de usuário mais forte
- fluxos de agendamento mais claros
- regras mais simples
- limites de V1 melhores

### 3.2 V1 deve ser forte, não grande

Um V1 forte não é um V1 cheio de features.

Um V1 forte significa:
- regras de agendamento confiáveis
- escopo claro
- fluxo de usuário simples
- fundação técnica estável

### 3.3 Uma agenda por profissional simplifica tudo

Escolher uma agenda por profissional no V1 reduz muito a complexidade em:
- modelagem de dados
- design de API
- regras de validação
- fluxo mobile
- visualização de agenda

### 3.4 Booking de convidado reduz atrito

Remover contas obrigatórias de clientes ajuda:
- reduzir o atrito de agendamento
- tornar V1 mais simples
- focar no problema real de agendamento

## 4. Lições de arquitetura

### 4.1 Lógica de agenda é o verdadeiro núcleo

O sistema não é principalmente sobre screens.

É principalmente sobre:
- regras de disponibilidade
- horários bloqueados
- duração do serviço
- garantias de não-sobreposição
- integridade de reagendamento

### 4.2 Disponibilidade e horários bloqueados devem permanecer separados

São conceitos diferentes e não devem ser misturados.

- availability_rules definem horários de trabalho recorrentes
- blocked_slots definem janelas indisponíveis pontuais

Misturá-los criaria confusão e lógica frágil.

### 4.3 Snapshots são necessários

Agendamentos devem armazenar snapshots de valores importantes.

Isso protege o histórico quando:
- um serviço muda
- um cliente muda
- um preço muda depois
- um nome muda depois

### 4.4 Reagendamento deve preservar rastreabilidade

Reagendamento não deve sobrescrever o agendamento original.

Deve ser tratado como:
- cancelar agendamento antigo
- criar novo agendamento
- manter vínculo entre ambos

## 5. Lições de fluxo de trabalho

### 5.1 Ambiente limpo importa

Criar o ambiente Docker primeiro foi a jogada certa.

Ajudou:
- isolar o projeto
- evitar contaminação do host
- criar um fluxo terminal-agente mais seguro
- alinhar com a ideia de AI jail

### 5.2 Higiene da raiz do projeto importa

Limpar a pasta raiz foi necessário.
Uma raiz bagunçada cria confusão para:
- o humano
- o agente de IA
- documentação futura
- estrutura de implementação

### 5.3 PowerShell deve ser o padrão no Windows

Usar PowerShell como shell local padrão é mais confiável para este projeto e reduz confusão de comandos no ambiente Windows.

### 5.4 Documentação em inglês reduz atrito

Escrever arquivos técnicos do projeto em inglês é melhor para:
- agentes de terminal
- consistência
- estabilidade de encoding
- legibilidade técnica

## 6. Lições sobre uso de IA

### 6.1 A IA precisa de limites

Sem restrições explícitas, um agente de IA tende a:
- adicionar escopo
- assumir features
- inventar estrutura
- otimizar por velocidade em vez de correção

### 6.2 Documentação é contexto operacional

Arquivos como:
- GEMINI.md
- CLAUDE.md
- architecture.md
- roadmap.md

não são apenas notas.

Eles são parte do sistema de execução.

### 6.3 O humano deve permanecer no papel de arquiteto

O humano deve definir:
- escopo
- arquitetura
- regras de negócio
- ordem de implementação
- critérios de aceitação

A IA deve executar, não liderar a direção do produto.

### 6.4 Documentação-first reduz retrabalho

Escrever a estrutura do projeto e regras antes de codificar reduz:
- ambiguidade
- más suposições
- implementação aleatória
- refatoração causada por contexto faltante

## 7. Lições confirmadas atuais

Neste estágio, as lições confirmadas mais importantes são:
- foco em nicho melhora a qualidade das decisões
- lógica de agendamento é mais importante que velocidade de UI
- Docker primeiro foi a decisão certa
- higiene da raiz do projeto importa
- PowerShell deve ser o shell local padrão
- documentação técnica em inglês é melhor para este fluxo
- documentação-first vale o tempo

## 8. Perguntas abertas para validar na prática

Estas são coisas que ainda precisam de validação real:
- se 30 minutos é o melhor pré-aviso mínimo de agendamento
- se 2 horas é o melhor aviso de cancelamento/reagendamento
- se confirmação na tela é suficiente para o primeiro ciclo de testes
- se a visão semanal precisa de simplificação para usuários reais
- se a criação de horário bloqueado precisa ser mais rápida no fluxo mobile

## 9. Regra para atualizações futuras

Este documento deve ser atualizado sempre que:
- um erro for descoberto
- um padrão melhor for validado
- uma suposição de produto mudar
- um fluxo de trabalho técnico se provar útil
- um problema repetitivo for identificado

O objetivo é transformar experiência do projeto em conhecimento reutilizável.
