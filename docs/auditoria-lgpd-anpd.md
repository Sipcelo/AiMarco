# Auditoria de Segurança de Dados — LGPD / ANPD (AiMarco V1)

> Data: 2026-06-23 · Escopo: backend (`backend/src`) · Status: **diagnóstico para decisão humana — nenhuma correção P1/P2 aplicada ainda**
> Objetivo: listar riscos com base legal, local exato (arquivo:linha), impacto, medida proposta e teste positivo — para decidirmos **antes** de mexer no código.

## Fontes oficiais usadas

- **LGPD** (Lei 13.709/2018): art. 6º (princípios), art. 18 (direitos do titular), art. 46-49 (segurança/boas práticas).
- **ANPD — Guia de Segurança da Informação para Agentes de Tratamento de Pequeno Porte** (v1.0, out/2021). AiMarco se enquadra como pequeno porte.
  `https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf`
- **ANPD — Guia dos Agentes de Tratamento** (controlador/operador/encarregado).
- **CGI.br / CERT.br** — "Segurança Digital: gestão de risco em empresas brasileiras" (citado pela ANPD).

---

## Estado encontrado (o que já está correto)

Estes controles existem e têm teste — servem de linha de base positiva, **não precisam de ação**:

| Controle | Base | Onde |
|---|---|---|
| Minimização: DTO remove PII em respostas públicas | LGPD 6º III; Guia §44-45 | `backend/src/dtos/index.ts` |
| Ownership / autorização por profissional | LGPD 46; Guia §39 | `backend/src/middleware/auth.ts` + checagem nos handlers |
| Autenticação server-side (JWT via Supabase) | LGPD 46; Guia §34 | `backend/src/middleware/auth.ts` |
| Rate limit no booking público (10/min/IP) | boas práticas | `backend/src/app.ts:178-196` |
| Validação Zod em todos os bodies | LGPD 46 | `backend/src/shared/schemas/**` |
| Rejeição de SQL-injection / header-injection | LGPD 46 | `backend/tests/security/auth-injection.test.ts` |
| Logs de erro em appointments **sem PII** (só metadado) | LGPD 6º III | `list-appointments.ts:39`, `cancel-appointment.ts:53` |

---

## Riscos / Achados

Resumo (decidir item a item):

| ID | Severidade | Tema | Base | Onde (arquivo:linha) | Status |
|----|-----------|------|------|----------------------|--------|
| R-01 | P0 | Sem cabeçalhos de segurança nas respostas | LGPD 46; Guia §52-53 | `backend/src/app.ts:110` | **já aplicado (rev. anterior) — revisar/reverter** |
| R-02 | P1 | Política de senha fraca (só ≥6) | LGPD 46; Guia §36 | `backend/src/shared/schemas/auth.ts:12-15` | pendente decisão |
| R-03 | P1 | Sem endpoint de eliminação/portabilidade do titular | LGPD 18 (V, VI) | `backend/src/routes/v1/**` (ausência) | pendente decisão |
| R-04 | P2 | PII (`phone`) gravada em log de servidor | LGPD 6º III; 46 | `backend/src/routes/v1/auth/signup.ts:89-95` | pendente decisão |
| R-05 | P2 | Resposta de erro vaza detalhe do banco | LGPD 46 (boas práticas) | `backend/src/routes/v1/auth/signup.ts:97-106` | pendente decisão |
| R-06 | P2 | CORS com allowlist ampla + `credentials:true` | LGPD 46 | `backend/src/app.ts:45-50,87-98` | pendente decisão |
| R-07 | Metodologia | Suite de testes acoplada ao código (risco de "verde fácil") | — | `backend/tests/security/lgpd-anpd-compliance.test.ts` | pendente decisão |

---

### R-01 — Ausência de cabeçalhos de segurança (P0)

- **Base legal:** LGPD art. 46 (proteção contra acesso não autorizado); Guia ANPD §52-53 (segurança das comunicações / dados em trânsito).
- **Onde foi encontrado:** `backend/src/app.ts` — o app só setava CORS e rate-limit; nenhuma resposta carregava `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- **Impacto:** sem HSTS um cliente pode ser rebaixado para HTTP (MITM); sem `X-Frame-Options` há risco de clickjacking na página pública `/p/:slug`; sem `nosniff` há MIME-sniffing.
- **Medida proposta (mínima, sem refatorar, sem nova dependência):** 4 `reply.header(...)` dentro do hook `onSend` já existente — `app.ts:110`.
- **Teste positivo:** subir o app real e afirmar que `GET /health` devolve os 4 cabeçalhos.
- **Status:** ⚠️ **já apliquei na rodada anterior.** Como o pedido agora é "documentar antes de agir", deixo registrado: posso **manter** (é aditivo e de baixo risco — HSTS só afeta clientes HTTPS, e a Railway serve HTTPS) **ou reverter** para baseline limpo até sua decisão.

---

### R-02 — Política de senha fraca (P1)

- **Base legal:** Guia ANPD §36 ("detectar e não permitir senhas que não respeitem um certo nível de complexidade… número de caracteres… caractere especial"); CERT.br/CGI.br (identificação/autenticação entre as 3 medidas de maior impacto).
- **Onde foi encontrado:** `backend/src/shared/schemas/auth.ts:12-15` — `password` exige apenas `min(6)`/`max(100)`, sem nenhuma regra de composição.
- **Impacto:** contas de profissionais (que acessam PII de clientes) protegidas por senhas como `123456`. Vetor direto de comprometimento.
- **Medida proposta (alterar SÓ o campo `password`, sem tocar no resto do schema):** `auth.ts:12-15`. Proposta de regra (a confirmar):
  - mínimo **8** caracteres;
  - ao menos **1 letra**, **1 número** e **1 caractere especial**;
  - mensagens em pt-BR, uma por regra.
  - `LoginSchema` **não muda** (continua `min(1)`) para não travar contas já existentes.
- **Teste positivo:**
  - rejeita `12345`, `abcdefgh`, `abc12345` (sem especial);
  - aceita `Senha@123`.
- **Impacto colateral a validar antes:** o cadastro web (`web/src/**`) e mobile (`apps/mobile/**`) precisam refletir a nova mensagem; usuários atuais não são afetados (só novos cadastros / troca de senha). Decisão de produto sobre exigir ou não caractere especial.

---

### R-03 — Sem direitos do titular: eliminação / portabilidade (P1)

- **Base legal:** LGPD art. 18, V (portabilidade) e VI (eliminação dos dados tratados com consentimento); Guia ANPD §50 (descarte seguro).
- **Onde foi encontrado:** `backend/src/routes/v1/**` — existem cancelamento de agendamento e update de perfil, mas **não há** rota para o titular (cliente) solicitar exclusão/exportação dos seus dados pessoais (nome/telefone/histórico).
- **Impacto:** pedido de titular hoje não tem caminho técnico → risco de não conformidade em fiscalização.
- **Medida proposta:** novos endpoints (não é refatoração; é adição) — ex.: `DELETE /v1/clients/:id` (eliminação) e `GET /v1/clients/:id/export` (portabilidade), com ownership e registro do descarte (Guia §51).
- **Teste positivo:** após eliminação, o cliente não retorna em listagens e seus snapshots de PII são anonimizados; export devolve JSON apenas dos dados do próprio titular.
- **Observação:** precisa de decisão de produto (quem aciona — profissional em nome do cliente? canal direto do cliente?). É o item mais aberto.

---

### R-04 — PII gravada em log de servidor (P2)

- **Base legal:** LGPD art. 6º III (necessidade) e art. 46 (segurança); o tratamento inclui o armazenamento em log.
- **Onde foi encontrado:** `backend/src/routes/v1/auth/signup.ts:89-95` — `console.error('… DATABASE DETAIL …', { authUserId, slug, phone: normalizedPhone, business_type, profError })` grava o **telefone** do profissional no log. (Secundário: `signup.ts:41` loga `authError`, que pode ecoar o e-mail.)
- **Impacto:** PII espalhada em logs (retidos pela Railway), fora do princípio da necessidade. Os logs de appointments **não** têm esse problema (já verificado).
- **Medida proposta:** remover `phone` (e e-mail) do objeto logado; manter `authUserId`/`slug`/`code` para diagnóstico — `signup.ts:89-95` (e revisar `:41`).
- **Teste positivo:** difícil testar log diretamente sem acoplar; proposta = teste que faz spy em `console.error` no fluxo de erro do signup e afirma que o argumento logado **não** contém o telefone.

---

### R-05 — Resposta de erro vaza detalhe do banco (P2)

- **Base legal:** LGPD art. 46 / art. 49 (boas práticas; mensagens não devem expor internals).
- **Onde foi encontrado:** `backend/src/routes/v1/auth/signup.ts:97-106` — em falha de DB, devolve ao cliente `{ code: profError.code, message: profError.message, detail: profError.details }`. (Menor: `cancel-appointment.ts:59` devolve `diag` com `err.message`.)
- **Impacto:** expõe estrutura do banco/Supabase a um endpoint **público** (signup), facilitando reconhecimento por atacante.
- **Medida proposta:** responder mensagem genérica ("Erro ao criar conta. Tente novamente.") e manter o detalhe **só** no log do servidor — `signup.ts:97-106`.
- **Teste positivo:** simular erro de DB no signup e afirmar que o corpo da resposta **não** contém `code`/`detail`/nome de coluna.

---

### R-06 — CORS amplo com credenciais (P2)

- **Base legal:** LGPD art. 46.
- **Onde foi encontrado:** `backend/src/app.ts:45-50` (allowlist `^https://.*\.railway\.app$` e `.*\.vercel\.app$`) combinada com `credentials: true` (`:97`) e eco de origem no `onSend` (`:110-118`).
- **Impacto:** **qualquer** app `*.railway.app`/`*.vercel.app` (não só os nossos) é uma origem confiável para requisições com credenciais. Risco mitigado hoje porque a auth é por Bearer token (não cookie), mas a allowlist é mais larga que o necessário.
- **Medida proposta:** restringir aos domínios exatos do projeto (ex.: `aimarco.up.railway.app`, `auralynne.up.railway.app`, domínio de produção) em vez de wildcard de subdomínio — `app.ts:45-50`.
- **Teste positivo:** origem `https://evil.railway.app` **não** recebe `Access-Control-Allow-Origin`; origem do projeto recebe.

---

### R-07 — Metodologia de teste: evitar "verde fácil" / base real (decisão importante)

**Sua exigência:** os testes de conformidade devem rodar **como um projeto independente**, sem risco de "codar só para dar verde", com **base real**.

- **Problema atual:** o arquivo criado (`backend/tests/security/lgpd-anpd-compliance.test.ts`) **importa o próprio código-fonte** (`src/dtos`, `src/app`, `SignupSchema`). Parte das asserções testa a implementação contra ela mesma (ex.: chamar `toPublicProfessional` e conferir as chaves). Isso pega regressão, mas **não é independente** — se alguém "ajustar" o código e o teste juntos, o verde mente.
- **Proposta de base real (black-box), sem refatorar a app:**
  1. Suite de conformidade num diretório/projeto separado (ex.: `compliance-tests/`) com seu **próprio `package.json`** e runner — **não importa nada de `backend/src`**.
  2. Ela sobe a app real (`node dist/server.js`) ou aponta para uma **URL de staging** e faz **requisições HTTP de verdade**, afirmando sobre as respostas (status, headers, ausência de PII no corpo).
  3. Assim o teste valida **comportamento observável em produção**, não a estrutura interna — não dá para "fazer passar" sem realmente cumprir o requisito.
  - Os testes de unidade que importam `src` (DTO/Zod) continuam existindo no `backend/tests` como guarda de regressão, mas **não** contam como prova de conformidade — quem prova é a suite black-box.
- **Decisão necessária:** (a) criar `compliance-tests/` independente apontando para staging/URL real, ou (b) manter tudo dentro de `backend/tests` aceitando o acoplamento. Recomendo (a) para "base real".

---

## Perguntas para decisão humana

1. **R-01 (headers):** manter a alteração já feita em `app.ts` ou reverter até a análise terminar?
2. **R-02 (senha):** exigir caractere especial além de letra+número? Mínimo 8 está ok?
3. **R-03 (direitos do titular):** quem aciona eliminação/exportação — profissional pelo painel, ou canal direto do cliente?
4. **R-07 (metodologia):** criar `compliance-tests/` como projeto independente apontando para staging, ou manter no `backend/tests`?
5. Ordem de execução das correções (sugiro R-01 → R-05 → R-04 → R-02 → R-06 → R-03).

> Nenhuma correção de R-02 a R-07 foi aplicada. Aguardando sua análise.

---

## Baseline real — suite black-box independente (2026-06-23)

Projeto `compliance-tests/` (independente, sem importar `backend/src`, via HTTP real).
Rodado contra a API ao vivo. **Descoberta importante:** a API não responde mais em
`aimarco.up.railway.app` (404) — está em **`auralynne.up.railway.app`** (rebrand).

`cd compliance-tests && node --test`

| Teste | Resultado ao vivo | Leitura |
|-------|-------------------|---------|
| R-01 headers de segurança | ❌ FAIL | fix existe no código local, **mas não foi deployado** |
| R-MIN perfil público sem PII | ✅ PASS | conformidade real comprovada em produção |
| R-05 erro 404 sem internals | ✅ PASS | ok |
| R-06 CORS origem arbitrária | ❌ FAIL | confirma o gap **ao vivo**: reflete `evil.railway.app` |
| R-02a senha curta rejeitada | ✅ PASS | piso de 6 ativo em produção |
| R-02b complexidade de senha | ⊘ SKIP | só em staging (cria conta) |
| R-03 direitos do titular | ☐ TODO ×2 | sem endpoint |

**Total: 3 pass · 2 fail · 1 skip · 2 todo.** Este é o estado **real** do que está no ar
(não do código local). R-01 vira verde após deploy; R-06 exige correção + deploy.
