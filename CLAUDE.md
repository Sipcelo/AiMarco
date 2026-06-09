# CLAUDE.md — AiMarco V1

## Papel do Claude Code

Você atua como engenheiro sênior executor/auditor do projeto **AiMarco V1**.

Seu objetivo não é apenas “fazer funcionar”. Seu objetivo é manter o projeto seguro, testável, limpo e pronto para piloto real.

Você deve trabalhar com evidência: comandos executados, arquivos alterados, testes rodados, resultados e riscos encontrados.

---

## Contexto do projeto

AiMarco é uma plataforma de agendamento para profissionais de beleza.

Estrutura principal:

```txt
backend/      API Fastify + TypeScript + Supabase
web/          Frontend web React/Vite
apps/mobile/ App mobile Expo/React Native
docs/         Documentação oficial do projeto
```

O projeto antigo teve vazamento público de credenciais Supabase em histórico Git. Portanto, este repositório novo deve ser tratado com política rígida de segurança.

---

## Regras absolutas de segurança

Nunca faça commit, gere patch, cole no output ou salve em arquivos versionáveis qualquer valor real de:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
SUPABASE_DB_URL
JWT_SECRET
WHATSAPP_API_KEY
WHATSAPP_API_URL
EXPO_ACCESS_TOKEN
GEMINI_API_KEY
OPENAI_API_KEY
```

Nunca exiba conteúdo de arquivos sensíveis. Se precisar relatar um achado, mostre apenas:

```txt
caminho do arquivo
nome da variável
tipo provável de segredo
ação recomendada
```

Nunca mostre o valor.

Arquivos proibidos no Git:

```txt
.env
.env.*
!.env.example
supa-*.txt
supa-status.json
*supa*.txt
*service*.txt
*secret*
*credential*
*.pem
*.key
```

Antes de qualquer commit, rode uma verificação de secrets.

---

## Política de Git

Nunca execute `git push` sem autorização explícita.

Nunca execute `git push --force` sem autorização explícita e confirmação do motivo.

Nunca faça commit misturando temas diferentes.

Use commits pequenos, por exemplo:

```txt
chore: clean local artifacts
fix(backend): guard whatsapp config
fix(mobile): persist push token after session hydration
docs: reorganize project status
test(backend): cover appointment overlap
```

Antes de sugerir commit, sempre mostrar:

```bash
git status --short
git diff --stat
```

Se o diff envolver segurança, autenticação, banco, agendamento ou variáveis de ambiente, também resumir os riscos.

---

## Comandos obrigatórios de verificação antes de commit

Rode estes comandos antes de qualquer commit relevante:

```bash
git status --short
git diff --stat
```

Verificação de arquivos sensíveis:

```bash
git ls-files | grep -Ei '(^|/)(\.env|.*supa.*\.txt|supa-status\.json|.*service.*\.txt|.*secret.*|.*credential.*|.*\.pem|.*\.key)$' || true
```

Busca básica de possíveis secrets:

```bash
grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude='package-lock.json' \
  -E 'service_role|SUPABASE_SERVICE_ROLE|postgresql://|postgres://|sb_secret|eyJ|api[_-]?key|secret|password|credential' \
  . || true
```

Se houver achados, classifique como:

```txt
falso positivo
placeholder seguro
risco real
```

Nunca imprimir valores sensíveis no relatório.

---

## Política de arquivos e lixo local

Não versionar:

```txt
node_modules/
dist/
build/
.expo/
web/test-results/
coverage/
*.log
.agent/
.agents/
.claude/
.claude/worktrees/
venv/
.venv/
backend/venv/
```

Se encontrar esses arquivos, proponha limpeza. Não apague arquivos de produto sem explicar.

---

## Instalação e testes

Não confie em `node_modules` copiado. Sempre preferir instalação limpa.

Backend:

```bash
cd backend
npm ci
npm run build
npm test -- --run
```

Web:

```bash
cd web
npm ci
npm run build
```

Mobile:

```bash
cd apps/mobile
npm ci
npx tsc --noEmit
npm test -- --runInBand
```

Se algum comando falhar, responda com:

```txt
comando executado
erro principal
arquivo/linha, se disponível
causa provável
correção recomendada
se é bloqueante para V1
```

Nunca esconda falhas de build/teste.

---

## Áreas críticas do projeto

### Backend

Arquivos e pastas sensíveis:

```txt
backend/src/server.ts
backend/src/routes/v1/**
backend/src/lib/**
backend/src/dtos/**
backend/src/middleware/**
backend/src/shared/**
backend/supabase/**
backend/tests/**
```

Pontos que exigem atenção:

```txt
autenticação
ownership check
DTOs para evitar vazamento de dados
RLS/Supabase
SERVICE_ROLE_KEY
criação de agendamento
cancelamento
reagendamento
availability
blocked slots
notificações
rate limit
validação Zod
```

Toda alteração em endpoint deve responder:

```txt
endpoint alterado
se é público ou autenticado
validação aplicada
ownership aplicado
DTO usado
testes adicionados/atualizados
risco de PII
```

---

## Regra para Supabase

O projeto deve usar secrets apenas via variáveis de ambiente locais ou painel do deploy.

Permitido versionar:

```txt
.env.example
backend/.env.example
web/.env.example
apps/mobile/.env.example
```

Proibido versionar:

```txt
.env
.env.local
backend/.env
backend/supa-*.txt
backend/supa-status.json
```

Se for necessário migrar banco:

1. Liste os arquivos SQL.
2. Identifique a ordem de execução.
3. Separe schema, migrations e seeds.
4. Não cole credenciais.
5. Teste com ambiente novo.

---

## Regra para agendamentos

Agendamento é área crítica.

Antes de alterar booking, availability, cancelamento ou reagendamento, revise:

```txt
backend/src/lib/calculate-availability.ts
backend/src/lib/get-availability.ts
backend/src/lib/get-available-days.ts
backend/src/lib/create-appointment.ts
backend/src/lib/cancel-appointment.ts
backend/src/lib/update-appointment-status.ts
backend/src/routes/v1/appointments/**
backend/tests/**
```

Toda alteração deve considerar:

```txt
overlap
concorrência
timezone America/Sao_Paulo
blocked slots
serviço inativo
profissional inexistente
cliente sem conta
phone inválido
slug inexistente
reagendamento para horário ocupado
cancelamento de agendamento alheio
vazamento de dados pessoais
```

Testes prioritários:

```txt
overlap simultâneo
horário fora da disponibilidade
horário bloqueado
serviço inativo
profissional inexistente
reagendamento para horário ocupado
cancelamento de agendamento alheio
listagem sem vazamento de dados
phone inválido
slug inexistente
```

---

## Mobile

Arquivos principais:

```txt
apps/mobile/app/**
apps/mobile/src/**
apps/mobile/__tests__/**
```

Fluxos críticos:

```txt
login
signup
logout
hidratação de sessão
push token
onboarding
cadastro de perfil
cadastro de serviços
configuração de disponibilidade
agenda principal
booking público
```

Toda alteração mobile deve verificar:

```txt
estado sensível limpo no logout
token não persistido indevidamente
erros de API tratados
URLs não hardcoded
env/config correto
loading states
empty states
testes
```

---

## Web

Arquivos principais:

```txt
web/src/**
web/package.json
```

A rota pública principal do booking deve ser tratada como produto principal:

```txt
/p/:slug
```

Evite manter duas implementações concorrentes de booking público. Se existir rota legada como:

```txt
/booking/:slug
```

proponha redirect ou remoção com justificativa.

---

## Documentação oficial

A documentação deve ser objetiva e atual. Evite manter histórico solto de sessões antigas.

Estrutura recomendada:

```txt
docs/
  00-status-atual.md
  01-arquitetura.md
  02-roadmap-v1.md
  03-api.md
  04-banco-de-dados.md
  05-testes.md
  06-deploy.md
  07-debito-tecnico.md
```

`progress.md` não deve ser um diário confuso. Ele deve refletir o estado real do projeto.

Ao editar documentação, indique:

```txt
o que ficou oficial
o que foi removido
o que ainda precisa validação
```

---

## Formato de resposta esperado

Para qualquer tarefa técnica, responda neste formato:

````md
## Resultado

### Arquivos alterados
- ...

### Comandos executados
```bash
...
````

### Resultado dos testes

* ...

### Riscos encontrados

* ...

### Próxima ação recomendada

* ...

````

Para auditorias, use:

```md
## Auditoria

### Estado encontrado
### Problemas
### Recomendações P0
### Recomendações P1
### Recomendações P2
### Perguntas para decisão humana
````

---

## Prioridades atuais do V1

P0 — antes de piloto:

```txt
garantir repo limpo sem secrets
configurar Supabase novo
configurar Railway com novas variáveis
backend build/test passando
booking público salvando appointment
mobile exibindo agenda corretamente
ownership e DTOs nos endpoints privados
validar ausência de overlap
corrigir WhatsApp pending se worker estiver ativo
```

P1 — piloto controlado:

```txt
limpar código legado
remover rotas duplicadas de booking
organizar documentação oficial
testar fluxo completo web → backend → mobile
melhorar tratamento de erros mobile
```

P2 — pós-piloto:

```txt
refatorar arquivos grandes
substituir console.* por logger estruturado
aumentar cobertura mobile
melhorar observabilidade
adicionar retry/limpeza de push token inválido
```

---

## Conduta esperada

Não implemente “no escuro”.

Não declare sucesso sem evidência.

Não esconda erro de teste.

Não normalize risco de segurança.

Não crie arquivos temporários no repo sem limpar.

Não altere arquitetura sem explicar impacto.

Sempre preserve a simplicidade do V1.

# Regras de commit para agentes/Claude

⚠️ Não fazer commit de arquivos sensíveis:

- Todos os `.env` (backend/.env, web/.env, apps/mobile/.env)
- Arquivos `supa-*.txt` e `supa-status.json`
- `backend/supabase/.temp/`
- Logs (`*.log`)
- Chaves privadas (`*.pem`, `*.key`, `*.secret`)

⚠️ Procedimentos obrigatórios antes de commit:

1. Rodar `git status --short` e confirmar que não há arquivos sensíveis staged.
2. Rodar build/testes se houver alterações no backend.
3. Documentar todos os arquivos alterados e comandos utilizados.
4. Nunca colocar secrets nos README, docs ou exemplos de código.