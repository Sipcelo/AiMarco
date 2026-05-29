# SPEC — Estabilizar testes backend AiMarco V1 após migração para repo limpo e novo Supabase

Você é o engenheiro sênior responsável por estabilizar o backend do AiMarco V1.

O objetivo desta tarefa é deixar a suíte de backend confiável, separando testes válidos de testes legados, corrigindo harness/infra de testes e preservando as garantias de domínio do projeto.

Não faça push. Não mostre secrets. Não altere `.env`. Não reescreva regras de negócio sem evidência.

---

## 0. Contexto obrigatório

O projeto foi migrado para um repositório limpo `AiMarco`, após vazamento público de credenciais no repositório antigo.

Um novo projeto Supabase já foi criado e as migrations foram aplicadas com sucesso.

O arquivo `backend/.env` já foi atualizado localmente com:

* `SUPABASE_URL`
* `SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`
* `DATABASE_URL`
* `JWT_SECRET`

Esse arquivo não deve aparecer no Git.

O comando abaixo já mostrou que o `.env` está ignorado:

```bash
git status --short
```

Porém, após `supabase link`, arquivos locais da Supabase CLI apareceram em:

```txt
backend/supabase/.temp/
```

Esses arquivos são cache/config local e não devem ser versionados.

---

## 1. Leia os documentos antes de alterar código

Antes de qualquer alteração, leia e use como fonte de verdade:

```txt
CLAUDE.md
docs/architecture.md
docs/api_v1.md
docs/roadmap.md
docs/progress.md
backend/README.md
backend/api-summary.md
backend/data-model.md
backend/schema-v1.md
```

Depois responda em 10 linhas:

1. qual é a arquitetura ativa do backend;
2. quais garantias de domínio não podem ser quebradas;
3. quais testes são P0 para V1;
4. quais arquivos de teste parecem legados.

Não altere nada antes dessa leitura.

---

## 2. Regras absolutas

Não mostrar valores de secrets.

Não fazer `git push`.

Não alterar `backend/.env`.

Não imprimir `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_SECRET` ou qualquer token.

Não criar compatibilidade artificial com arquitetura antiga se o teste estiver errado. Primeiro classifique.

Não ressuscitar arquivos antigos como `src/lib/router.ts`, `src/lib/auth.ts` ou `src/lib/schemas.ts` sem justificar por que eles ainda pertencem à arquitetura atual.

A arquitetura atual parece ser:

```txt
Fastify
src/server.ts
src/middleware/auth.ts
src/shared/schemas/**
src/lib/fastify-adapter.ts
src/routes/v1/**
```

Se um teste importa arquitetura antiga, provavelmente o teste deve ser migrado ou arquivado, não o produto adaptado ao teste.

---

## 3. Estado atual observado

O teste backend apresentou estas classes de falhas:

### A. Supabase CLI local cache no Git

```txt
M backend/supabase/.temp/cli-latest
?? backend/supabase/.temp/gotrue-version
?? backend/supabase/.temp/linked-project.json
?? backend/supabase/.temp/pooler-url
?? backend/supabase/.temp/postgres-version
?? backend/supabase/.temp/project-ref
?? backend/supabase/.temp/rest-version
?? backend/supabase/.temp/storage-migration
?? backend/supabase/.temp/storage-version
```

Depois de tentativa de limpeza, o estado ficou:

```txt
M .gitignore
D backend/supabase/.temp/cli-latest
```

### B. Testes de integração chamando servidor local ausente

Falhas com:

```txt
ECONNREFUSED ::1:3333
ECONNREFUSED 127.0.0.1:3333
```

Exemplo: `tests/integration/auth-gauntlet.test.ts` chama:

```txt
http://localhost:3333
```

mas o servidor não estava rodando.

### C. Testes legados importando módulos inexistentes

Falhas com módulos ausentes:

```txt
Cannot find module '../../src/lib/auth'
Cannot find module '../../src/lib/auth.js'
Cannot find module '../../src/lib/router.js'
Cannot find module '../../src/lib/schemas.js'
```

Esses imports aparecem em testes como:

```txt
tests/security/auth-verify-private.test.ts
tests/integration/auth.test.ts
tests/integration/concurrency.test.ts
tests/integration/edge_cases.test.ts
tests/integration/lunch_break.test.ts
tests/integration/profile.test.ts
tests/integration/reschedule.test.ts
tests/integration/security_audit.test.ts
tests/integration/services.test.ts
tests/integration/validation.test.ts
```

### D. Arquivos `.test.ts` usando `node:test`

Há arquivos usando `node:test`, mas rodados pelo Vitest. Isso gera casos como:

```txt
No test suite found
```

Exemplo:

```txt
tests/integration/server-auth.test.ts
```

### E. Bug/má modelagem de teste timezone em recall

Falha:

```txt
tests/unit/recall-list.test.ts
RL-9: threshold inclusive boundary check (same day excluded)
```

O problema parece ser normalização de data usando `setHours`, sensível ao timezone local do Windows.

### F. Mock incompleto de Supabase chain

Erro:

```txt
supabase.from(...).select(...).eq(...).gte is not a function
```

Arquivo relacionado:

```txt
src/lib/list-appointments.ts
```

A função real encadeia:

```txt
select().eq().gte().lte().order()
```

O mock do teste não cobre a chain completa.

### G. Testes de header injection gerando ruído

Os testes de header injection passam, mas geram logs de `TypeError: Headers.append ... invalid header value`.

Isso indica que o middleware deixa tokens com caracteres de controle chegarem até o Supabase client. A regra desejável é rejeitar antes com 401.

---

## 4. Objetivo técnico

Entregar uma suíte backend organizada em categorias:

```txt
unit
domain
security
integration
integration:server
```

E garantir que:

1. testes unitários não dependam de servidor local;
2. testes de domínio não dependam de Supabase real, salvo explicitamente;
3. testes de segurança usem Fastify ou mocks consistentes;
4. testes de integração que dependem de servidor tenham setup explícito;
5. não existam imports para módulos inexistentes;
6. não existam arquivos `.test.ts` sem suíte reconhecida pelo Vitest;
7. não exista cache local do Supabase CLI versionado;
8. `npm run build` passe;
9. um comando claro de testes P0 passe no Windows.

---

## 5. Plano de execução obrigatório

### Fase 1 — Higiene de Git e Supabase CLI

1. Atualizar `.gitignore` para incluir:

```gitignore
# Supabase CLI local cache
backend/supabase/.temp/
```

2. Remover do índice qualquer arquivo já rastreado:

```bash
git rm --cached -r backend/supabase/.temp
```

Se o arquivo já foi removido localmente, resolver o estado `D` corretamente com `git add -A`.

3. Rodar:

```bash
git status --short
```

Esperado:

```txt
M .gitignore
D backend/supabase/.temp/cli-latest
```

ou depois do `git add -A`:

```txt
M .gitignore
D backend/supabase/.temp/cli-latest
```

Explique se o arquivo estava rastreado anteriormente.

Não commit ainda.

---

### Fase 2 — Auditar os testes, não corrigir às cegas

Rode:

```bash
cd backend
find tests -name "*.test.ts" | sort
```

Para cada arquivo de teste, classifique numa tabela:

```txt
Arquivo
Tipo: unit/domain/security/integration/integration:server/legacy
Usa Vitest?
Usa node:test?
Depende de servidor localhost?
Depende de Supabase real?
Importa módulo inexistente?
Ação recomendada: manter/migrar/arquivar/corrigir mock
Prioridade: P0/P1/P2
```

P0 para V1:

```txt
availability
can-book-slot
create appointment conflict/overlap
concurrency/race condition
DTO sanitization
auth middleware
ownership checks
public booking
appointment cancel/reschedule
phone validation
schema validation
```

P2 ou fora do V1:

```txt
recall-list, se a feature não está ativa
init-memory/Gemini/AI recall
worker WhatsApp real, se WHATSAPP_API_URL=pending
```

---

### Fase 3 — Corrigir harness de servidor

O problema `ECONNREFUSED :3333` não deve ser resolvido “lembrando o dev de rodar npm run dev” para todo teste.

Escolha uma estratégia e aplique consistentemente:

#### Estratégia preferida

Refatorar o servidor para exportar uma função de construção do Fastify app:

```txt
src/app.ts      cria e configura o Fastify, registra plugins e rotas, exporta buildApp()
src/server.ts   importa buildApp() e apenas dá listen()
```

Critérios:

* `src/server.ts` não deve chamar `listen()` durante import de testes.
* Testes podem usar `const app = await buildApp({ logger: false })`.
* Testes podem usar `await app.inject(...)`.
* `npm run dev` e `npm start` continuam funcionando.

Não quebre Dockerfile/Railway.

#### Estratégia alternativa

Se refatorar agora for arriscado, os testes que usam `localhost:3333` devem ser renomeados ou movidos para `tests/integration-server/` e rodar apenas com script específico, documentado:

```txt
npm run dev
npm run test:integration:server
```

Mas essa estratégia é menos desejável.

---

### Fase 4 — Resolver testes legados de router/auth/schemas

Não crie `src/lib/router.ts` só para satisfazer teste legado, a menos que prove que ele ainda é usado por produto.

Para cada import quebrado:

#### Caso `../../src/lib/router.js`

Provável arquitetura antiga.

Ação recomendada:

* migrar o teste para Fastify `app.inject`;
* ou arquivar em `tests/legacy/` e excluir da suíte P0.

#### Caso `../../src/lib/auth.js` ou `../../src/lib/auth`

A arquitetura atual usa:

```txt
src/middleware/auth.ts
```

Ação recomendada:

* migrar os testes para validar o middleware Fastify atual;
* testar:

  * ausência de token → 401;
  * token inválido → 401;
  * usuário sem professional vinculado → 403;
  * professional vinculado → request.auth populado;
  * ownership check nos handlers protegidos.

#### Caso `../../src/lib/schemas.js`

A arquitetura atual usa:

```txt
src/shared/schemas/**
```

Ação recomendada:

* atualizar imports para `src/shared/schemas/index.ts` ou arquivo correto;
* ou mover os schemas esperados para `shared/schemas` se realmente faltarem;
* garantir que `validation.test.ts` valide os schemas reais.

---

### Fase 5 — Corrigir scripts de teste

Atualize `backend/package.json` para separar scripts. Proposta:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit tests/domain",
    "test:security": "vitest run tests/security tests/auth",
    "test:integration": "vitest run tests/integration",
    "test:coverage": "vitest run --coverage"
  }
}
```

Atenção:

* `npm test` deve ser modo não-watch.
* Em CI/validação, usar `vitest run`, não `vitest` interativo.
* Se houver testes legados ainda não migrados, não inclua na suíte padrão até serem corrigidos.

Se necessário, ajuste `vitest.config.ts` para excluir temporariamente `tests/legacy/**`.

Não esconda teste crítico. Se arquivar, justifique.

---

### Fase 6 — Corrigir timezone do `recall-list.test.ts`

O teste `RL-9` falha por comparação de data sensível ao timezone local.

Corrigir usando normalização UTC, por exemplo:

```ts
function startOfUtcDay(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}
```

Regra esperada:

```txt
consulta de recall deve incluir apenas clientes cujo último appointment é anterior ao dia-limite;
appointments no mesmo dia do threshold são excluídos;
appointments no dia anterior são incluídos.
```

Se essa lógica é apenas de teste e não há função de produto equivalente, mova a função para um módulo real ou classifique como teste de feature ainda não ativa.

---

### Fase 7 — Corrigir mock chain de Supabase em `listAppointments`

Para qualquer teste que mocke `supabase.from().select().eq().gte().lte().order()`, criar helper de mock encadeável em:

```txt
tests/helpers/mockSupabaseQuery.ts
```

ou dentro do teste, com todos os métodos necessários.

A chain real esperada em `src/lib/list-appointments.ts` é:

```txt
from('appointments')
  .select(...)
  .eq('professional_id', professionalId)
  .gte('scheduled_at', startWindow)
  .lte('scheduled_at', endWindow)
  .order('scheduled_at', { ascending: true })
```

O mock precisa cobrir isso.

Não simplifique a função de produção só para caber no mock.

---

### Fase 8 — Reduzir ruído de header injection

No middleware de autenticação:

```txt
src/middleware/auth.ts
```

Antes de chamar:

```ts
supabase.auth.getUser(token)
```

validar que o token não contém caracteres de controle:

```txt
CR
LF
NUL
tabs indevidas
outros control chars
```

Se contiver, retornar 401 com erro genérico:

```json
{ "error": "Token inválido ou expirado." }
```

Critério:

* testes de header injection continuam passando;
* não deve aparecer stack trace de `Headers.append` no output normal;
* não vazar detalhes internos.

---

### Fase 9 — Separar testes que exigem Supabase real

Testes que conectam ao Supabase real devem:

1. verificar se variáveis de ambiente existem;
2. pular com mensagem explícita se não existirem;
3. não imprimir valores;
4. limpar dados de teste com prefixos seguros;
5. não depender de dados reais de produção.

Crie helper:

```txt
tests/helpers/env.ts
```

Com algo como:

```ts
export function requireIntegrationEnv() {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    ok: missing.length === 0,
    missing
  };
}
```

Use `describe.skipIf` ou equivalente do Vitest quando faltar env.

---

### Fase 10 — Rodar validação

Depois das correções, rode:

```bash
cd backend
npm run build
npm run test:unit
npm run test:security
npm run test:integration
```

Se `test:integration` ainda exigir servidor externo, documente e rode conforme script específico.

Também rode:

```bash
git status --short
git diff --stat
```

---

## 6. Critérios de aceite

A tarefa só está concluída quando:

```txt
npm run build passa
npm run test:unit passa
npm run test:security passa
não existem imports para módulos inexistentes
não existem arquivos .test.ts sem suíte Vitest reconhecida
backend/supabase/.temp está ignorado
backend/.env não aparece no git status
testes P0 de domínio continuam ativos
testes legados foram migrados ou movidos para tests/legacy com justificativa
```

Além disso:

```txt
não deve haver novo arquivo com secrets
não deve haver push
não deve haver alteração de regras de agendamento sem teste
não deve haver workaround que apenas oculte falha crítica
```

---

## 7. Relatório final obrigatório

Ao terminar, devolva o relatório neste formato:

````md
# Relatório — Estabilização dos testes backend AiMarco

## 1. Resumo
- Status do build:
- Status dos testes unit/domain:
- Status dos testes security:
- Status dos testes integration:
- Ainda bloqueia V1? sim/não

## 2. Arquivos alterados
| Arquivo | Motivo | Risco |
|---|---|---|

## 3. Testes classificados
| Arquivo | Classificação | Ação tomada | Prioridade |
|---|---|---|---|

## 4. Falhas corrigidas
- Supabase .temp:
- ECONNREFUSED:
- módulos inexistentes:
- node:test dentro de Vitest:
- recall-list timezone:
- Supabase mock chain:
- header injection logs:

## 5. Comandos executados
```bash
...
````

## 6. Resultados

```txt
cole apenas resumo, não logs gigantes
```

## 7. Pendências

* P0:
* P1:
* P2:

## 8. Próximas ações recomendadas

* ...

````

Não faça commit automaticamente. Ao final, apenas sugira os commits separados, por exemplo:

```bash
git add .gitignore backend/package.json backend/vitest.config.ts backend/src backend/tests
git commit -m "test(backend): stabilize vitest suites for Fastify architecture"
````

Se houver apenas limpeza do Supabase cache:

```bash
git add .gitignore backend/supabase/.temp
git commit -m "chore: ignore supabase cli local cache"
```
