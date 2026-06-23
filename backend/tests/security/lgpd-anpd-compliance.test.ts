/**
 * lgpd-anpd-compliance.test.ts
 *
 * Suite de conformidade LGPD / ANPD focada em SEGURANÇA DE DADOS PESSOAIS.
 * Cada bloco cita a base legal/normativa que está sendo verificada, de modo
 * que a suite sirva como evidência de conformidade (e detector de regressão).
 *
 * FONTES OFICIAIS:
 * - Lei 13.709/2018 (LGPD) — art. 6º (princípios), art. 18 (direitos do titular),
 *   art. 46-49 (segurança e boas práticas).
 * - ANPD — "Guia Orientativo sobre Segurança da Informação para Agentes de
 *   Tratamento de Pequeno Porte", v1.0, out/2021. (AiMarco é agente de pequeno porte.)
 *   https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf
 * - ANPD — "Guia dos Agentes de Tratamento" (controlador/operador/encarregado).
 * - CERT.br/CGI.br — "Segurança Digital: análise de gestão de risco em empresas
 *   brasileiras" (medidas de maior impacto: identificação/autenticação, patching, hardening).
 *
 * Escopo: apenas controles verificáveis em código. Medidas organizacionais
 * (PSI, treinamento, NDA, backup, antivírus, SLA de nuvem) ficam fora da suite.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import Fastify from "fastify";

import {
  toPublicProfessional,
  toPublicAppointment,
  toOwnProfessional,
} from "../../src/dtos/index.js";
import { SignupSchema, LoginSchema } from "../../src/shared/schemas/auth.js";
import { buildApp } from "../../src/app.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { getPublicProfile } from "../../src/routes/v1/public/get-public-profile.js";
import { supabase } from "../../src/lib/supabase.js";

// ─────────────────────────────────────────────────────────────────────────────
// A. PRINCÍPIO DA NECESSIDADE / MINIMIZAÇÃO DE DADOS
//    LGPD art. 6º, III — Guia ANPD §44-45 (coletar/expor apenas o necessário).
//    Verifica no LIMITE HTTP que a rota pública nunca devolve PII do profissional.
// ─────────────────────────────────────────────────────────────────────────────

describe("A. Necessidade/Minimização — rota pública não vaza PII (LGPD art. 6º III; Guia §44-45)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Linha "crua" do banco, com PII que NUNCA pode sair pela API pública. */
  const rawProfWithPII = {
    id: "prof-123",
    display_name: "Regina",
    bio: "Cabelos",
    avatar_url: null,
    timezone: "America/Sao_Paulo",
    slug: "regina-s-hair",
    business_type: "hair",
    // PII / campos internos:
    auth_user_id: "auth-uuid-secreto",
    email: "regina@email.com",
    phone: "+5511999999999",
    full_name: "Regina Ferreira da Silva",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  };

  function mockPublicProfileDb() {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "professionals") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: rawProfWithPII, error: null }),
            }),
          }),
        } as any;
      }
      // services
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      } as any;
    });
  }

  async function buildPublicApp() {
    const app = Fastify({ logger: false });
    app.get("/v1/public/professional/:id", adaptHandler(getPublicProfile));
    await app.ready();
    return app;
  }

  it("GET /v1/public/professional/:slug não inclui email, phone, full_name, auth_user_id nem audit fields", async () => {
    mockPublicProfileDb();
    const app = await buildPublicApp();

    const res = await app.inject({
      method: "GET",
      url: "/v1/public/professional/regina-s-hair",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Campos públicos esperados:
    expect(body.display_name).toBe("Regina");
    expect(body.slug).toBe("regina-s-hair");

    // PII / internos — NUNCA presentes:
    expect(body.email).toBeUndefined();
    expect(body.phone).toBeUndefined();
    expect(body.full_name).toBeUndefined();
    expect(body.auth_user_id).toBeUndefined();
    expect(body.created_at).toBeUndefined();
    expect(body.updated_at).toBeUndefined();

    // Defesa em profundidade: o JSON serializado não contém os valores sensíveis.
    const raw = res.body;
    expect(raw).not.toContain("regina@email.com");
    expect(raw).not.toContain("+5511999999999");
    expect(raw).not.toContain("auth-uuid-secreto");
    expect(raw).not.toContain("Regina Ferreira da Silva");

    await app.close();
  });

  it("DTO público de profissional só expõe a lista branca de campos", () => {
    const dto = toPublicProfessional(rawProfWithPII)!;
    expect(Object.keys(dto).sort()).toEqual(
      ["avatar_url", "bio", "business_type", "display_name", "id", "slug", "timezone"].sort(),
    );
  });

  it("DTO público de agendamento omite PII do cliente (client_name/client_phone)", () => {
    const dto = toPublicAppointment({
      id: "appt-1",
      scheduled_at: "2025-01-15T10:00:00-03:00",
      status: "confirmed",
      service_name: "Corte",
      client_name: "João Silva",
      client_phone: "+5511988887777",
      client_id: "cli-1",
      professional_id: "prof-1",
    })!;

    expect(dto).toEqual({
      id: "appt-1",
      scheduled_at: "2025-01-15T10:00:00-03:00",
      status: "confirmed",
      service_name: "Corte",
    });
    expect((dto as any).client_name).toBeUndefined();
    expect((dto as any).client_phone).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. CONTROLE DE ACESSO / MENOR EXPOSIÇÃO
//    LGPD art. 46 — Guia ANPD §34, §39 (need-to-know).
//    PII só é exposta a quem precisa: o próprio titular do perfil.
// ─────────────────────────────────────────────────────────────────────────────

describe("B. Menor exposição — PII do profissional só no próprio perfil (LGPD art. 46; Guia §39)", () => {
  const raw = {
    id: "p1",
    display_name: "Regina",
    slug: "regina",
    timezone: "America/Sao_Paulo",
    business_type: "hair",
    email: "regina@email.com",
    phone: "+5511999999999",
    full_name: "Regina Ferreira",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  };

  it("perfil próprio (autenticado) expõe email/phone para gestão", () => {
    const own = toOwnProfessional(raw)!;
    expect(own.email).toBe("regina@email.com");
    expect(own.phone).toBe("+5511999999999");
  });

  it("o mesmo registro no DTO público não expõe email/phone", () => {
    const pub = toPublicProfessional(raw)!;
    expect((pub as any).email).toBeUndefined();
    expect((pub as any).phone).toBeUndefined();
    expect((pub as any).full_name).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. AUTENTICAÇÃO / SENHAS
//    LGPD art. 46 — Guia ANPD §36-38; CERT.br (identificação/autenticação).
//    Garante um piso mínimo de senha no cadastro.
// ─────────────────────────────────────────────────────────────────────────────

describe("C. Senhas — piso mínimo no cadastro (LGPD art. 46; Guia §36)", () => {
  const base = {
    email: "novo@email.com",
    display_name: "Novo Pro",
    phone: "+5511999999999",
    business_type: "hair" as const,
  };

  it("rejeita senha com menos de 6 caracteres", () => {
    const r = SignupSchema.safeParse({ ...base, password: "12345" });
    expect(r.success).toBe(false);
  });

  it("aceita senha com 6+ caracteres", () => {
    const r = SignupSchema.safeParse({ ...base, password: "123456" });
    expect(r.success).toBe(true);
  });

  it("login exige senha não-vazia", () => {
    expect(LoginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  // GAP conhecido (ANPD §36 recomenda complexidade configurável: tamanho + caractere
  // especial). Hoje o piso é só 6 caracteres. Decisão de produto — ver relatório.
  it.todo("deve exigir complexidade de senha (caractere especial / maiúscula) — ANPD §36");
});

// ─────────────────────────────────────────────────────────────────────────────
// D. INTEGRIDADE / VALIDAÇÃO DE ENTRADA
//    LGPD art. 46 (integridade) — valida PII na fronteira para não persistir lixo.
// ─────────────────────────────────────────────────────────────────────────────

describe("D. Validação de entrada — PII malformada é rejeitada (LGPD art. 46)", () => {
  const base = {
    password: "123456",
    display_name: "Pro",
    phone: "+5511999999999",
    business_type: "hair" as const,
  };

  it("rejeita email malformado", () => {
    expect(SignupSchema.safeParse({ ...base, email: "sem-arroba" }).success).toBe(false);
  });

  it("rejeita telefone inválido", () => {
    expect(SignupSchema.safeParse({ ...base, email: "ok@email.com", phone: "123" }).success).toBe(false);
  });

  it("rejeita business_type fora do enum permitido", () => {
    expect(
      SignupSchema.safeParse({ ...base, email: "ok@email.com", business_type: "hacker" as any }).success,
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. SEGURANÇA DAS COMUNICAÇÕES / DADOS EM TRÂNSITO
//    LGPD art. 46 — Guia ANPD §52-53 (conexões cifradas, proteção do tráfego).
//    Verifica os cabeçalhos de segurança em respostas reais do app.
// ─────────────────────────────────────────────────────────────────────────────

describe("E. Comunicações — cabeçalhos de segurança presentes (LGPD art. 46; Guia §52-53)", () => {
  it("toda resposta carrega HSTS, nosniff, X-Frame-Options e Referrer-Policy", async () => {
    const app = await buildApp({ logger: false, serveStatic: false });
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    await app.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. DIREITOS DO TITULAR — ELIMINAÇÃO DE DADOS
//    LGPD art. 18 (eliminação/portabilidade) — Guia ANPD §50 (descarte seguro).
//    GAP: não há endpoint de exclusão/exportação de dados do titular. Roadmap.
// ─────────────────────────────────────────────────────────────────────────────

describe("F. Direitos do titular (LGPD art. 18) — pendências de roadmap", () => {
  it.todo("endpoint de eliminação de dados do cliente a pedido do titular (LGPD art. 18, VI)");
  it.todo("endpoint de exportação/portabilidade dos dados do titular (LGPD art. 18, V)");
});
