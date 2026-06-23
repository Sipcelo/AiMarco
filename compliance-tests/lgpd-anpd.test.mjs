/**
 * Suite de conformidade LGPD / ANPD — BLACK-BOX, projeto independente.
 *
 * Por que independente:
 * - Nao importa NADA de backend/src. So existe `fetch` + `node:test` (nativos).
 * - Bate em HTTP real (URL de producao ou staging). Valida COMPORTAMENTO observavel,
 *   nao a estrutura interna do codigo. Nao da pra "fazer passar" sem cumprir o requisito.
 *
 * Seguranca de execucao:
 * - Por padrao roda so testes read-only (GET/OPTIONS) — seguros contra producao.
 * - Testes que criam conta (politica de senha) ficam atras de COMPLIANCE_ALLOW_SIGNUP=1
 *   e devem apontar para STAGING (cadastros descartaveis).
 *
 * Config (env):
 *   COMPLIANCE_BASE_URL    URL base da API           (default: https://auralynne.up.railway.app)
 *   COMPLIANCE_PROF_SLUG   slug de um profissional    (default: regina-s-hair)
 *   COMPLIANCE_ALLOW_SIGNUP=1  habilita testes que fazem POST /signup (use em staging)
 *
 * Fontes: LGPD art. 6, 18, 46-49; Guia ANPD Pequeno Porte v1.0 (out/2021) secoes 3.2.1, 3.2.2, 3.2.3.
 */
import test from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.COMPLIANCE_BASE_URL ?? "https://auralynne.up.railway.app").replace(/\/+$/, "");
const SLUG = process.env.COMPLIANCE_PROF_SLUG ?? "regina-s-hair";
const ALLOW_SIGNUP = process.env.COMPLIANCE_ALLOW_SIGNUP === "1";

// Padroes para varredura de PII no corpo cru das respostas.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const BR_PHONE_RE = /\+?55\s?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/;
// Vazamento de internals de banco em mensagens de erro.
const DB_INTERNALS_RE = /supabase|postgres|postgresql|PGRST|relation\s|column\s|duplicate key|23505|auth_user_id/i;

// ─── E. Comunicacoes / dados em transito (LGPD 46; Guia 3.2.3) ────────────────

test("R-01 | /health expoe cabecalhos de seguranca (HSTS, nosniff, frame, referrer)", async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200, "GET /health deveria responder 200");
  assert.match(
    res.headers.get("strict-transport-security") ?? "",
    /max-age=\d+/,
    "Falta Strict-Transport-Security (HSTS) — Guia ANPD 3.2.3 / LGPD 46",
  );
  assert.equal(res.headers.get("x-content-type-options"), "nosniff", "Falta X-Content-Type-Options: nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY", "Falta X-Frame-Options: DENY (clickjacking na pagina publica)");
  assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin", "Falta Referrer-Policy");
});

// ─── A. Necessidade / minimizacao (LGPD 6 III; Guia 3.2.2) ────────────────────

test("R-MIN | perfil publico nao vaza PII do profissional", async () => {
  const res = await fetch(`${BASE}/v1/public/professional/${encodeURIComponent(SLUG)}`);
  assert.equal(
    res.status,
    200,
    `GET /v1/public/professional/${SLUG} respondeu ${res.status}. Defina COMPLIANCE_PROF_SLUG com um slug existente.`,
  );

  const text = await res.text();
  const body = JSON.parse(text);

  // Campos publicos esperados presentes:
  assert.ok(body.display_name, "esperado display_name no perfil publico");
  assert.ok(body.slug, "esperado slug no perfil publico");

  // PII / internos NUNCA presentes (chaves):
  for (const k of ["email", "phone", "full_name", "auth_user_id", "created_at", "updated_at"]) {
    assert.equal(body[k], undefined, `campo sensivel "${k}" nao deveria estar na resposta publica`);
  }

  // Defesa em profundidade: corpo cru nao contem padrao de e-mail nem telefone BR.
  assert.doesNotMatch(text, EMAIL_RE, "corpo publico contem algo parecido com e-mail (possivel PII)");
  assert.doesNotMatch(text, BR_PHONE_RE, "corpo publico contem algo parecido com telefone (possivel PII)");
});

// ─── R-05. Erro nao vaza internals do banco (LGPD 46/49) ──────────────────────

test("R-05 | 404 de perfil inexistente devolve erro generico (sem internals de banco)", async () => {
  const res = await fetch(`${BASE}/v1/public/professional/__inexistente_${Date.now()}`);
  assert.equal(res.status, 404, "perfil inexistente deveria responder 404");
  const text = await res.text();
  assert.doesNotMatch(text, DB_INTERNALS_RE, "mensagem de erro vaza detalhe de banco/infra");
});

// ─── R-06. CORS nao confia em origem arbitraria *.railway.app ──────────────────
// EXPECTATIVA: hoje a allowlist usa wildcard e este teste deve FICAR VERMELHO ate R-06 ser corrigido.
// E o baseline honesto do estado atual — nao mascarar.

test("R-06 | CORS nao deve refletir origem arbitraria https://evil.railway.app", async () => {
  const res = await fetch(`${BASE}/health`, { headers: { Origin: "https://evil.railway.app" } });
  const acao = res.headers.get("access-control-allow-origin");
  assert.notEqual(
    acao,
    "https://evil.railway.app",
    "API confia em qualquer *.railway.app (allowlist ampla + credentials) — restringir aos dominios do projeto",
  );
});

// ─── C. Politica de senha (LGPD 46; Guia 3.2.1 §36) ───────────────────────────

test("R-02a | signup rejeita senha curta (<6) — read-safe, nao cria conta", async () => {
  const res = await fetch(`${BASE}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `compliance.short+${Date.now()}@example.invalid`,
      password: "123",
      display_name: "Compliance Probe",
      phone: "+5511999999999",
      business_type: "hair",
    }),
  });
  // Zod rejeita antes de qualquer chamada ao Supabase → 400, sem efeito colateral.
  assert.equal(res.status, 400, "senha de 3 caracteres deveria ser rejeitada com 400");
});

// Complexidade plena (letra+numero+especial). Cria conta se passar → so em STAGING.
test(
  "R-02b | signup rejeita senha sem complexidade (letra+numero+especial)",
  { skip: ALLOW_SIGNUP ? false : "defina COMPLIANCE_ALLOW_SIGNUP=1 e aponte para STAGING" },
  async () => {
    const res = await fetch(`${BASE}/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `compliance.weak+${Date.now()}@example.invalid`,
        password: "abcdefgh", // 8 chars, so letras → deve ser rejeitada quando R-02 estiver implementada
        display_name: "Compliance Probe",
        phone: "+5511999999999",
        business_type: "hair",
      }),
    });
    assert.equal(res.status, 400, "senha sem numero/caractere especial deveria ser rejeitada (ANPD 3.2.1 §36)");
  },
);

// ─── F. Direitos do titular (LGPD art. 18) — gaps de roadmap ──────────────────
// Documentados como TODO ate existirem endpoints de eliminacao/portabilidade.

test("R-03 | direito de eliminacao do titular (LGPD 18 VI)", { todo: "endpoint nao implementado" }, () => {});
test("R-03 | direito de portabilidade do titular (LGPD 18 V)", { todo: "endpoint nao implementado" }, () => {});
