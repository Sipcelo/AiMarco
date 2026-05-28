import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3333";

// Use global fetch (Node 18+)
const fetchTest = (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args);

describe("Auth Gauntlet - Validation Errors", () => {
  describe("Signup - Field-level validation", () => {
    const cases = [
      {
        name: "Email sem @ deve retornar erro específico",
        payload: {
          email: "semarrobagmail.com",
          password: "Senha123!",
          display_name: "João Silva",
          full_name: "João Silva",
          phone: "+5511999999999",
          business_type: "barbershop",
        },
        expectedField: "email",
        expectedMessage: /e-mail.*escrito errado|verifique/i,
      },
      {
        name: "Senha muito curta (3 caracteres) deve retornar erro",
        payload: {
          email: "joao@gmail.com",
          password: "123",
          display_name: "João Silva",
          full_name: "João Silva",
          phone: "+5511999999999",
          business_type: "barbershop",
        },
        expectedField: "password",
        expectedMessage: /pelo menos 6 caracteres|segurança/i,
      },
      {
        name: "Nome de exibição com 1 caractere deve retornar erro",
        payload: {
          email: "joao@gmail.com",
          password: "Senha123!",
          display_name: "J",
          full_name: "João Silva",
          phone: "+5511999999999",
          business_type: "barbershop",
        },
        expectedField: "display_name",
        expectedMessage: /pelo menos 2 caracteres/i,
      },
      {
        name: "Nome completo muito curto deve retornar erro",
        payload: {
          email: "joao@gmail.com",
          password: "Senha123!",
          display_name: "João Silva",
          full_name: "J",
          phone: "+5511999999999",
          business_type: "barbershop",
        },
        expectedField: "full_name",
        expectedMessage: /pelo menos 3 caracteres/i,
      },
      {
        name: "Telefone inválido (sem +55) deve retornar erro",
        payload: {
          email: "joao@gmail.com",
          password: "Senha123!",
          display_name: "João Silva",
          full_name: "João Silva",
          phone: "9999999999",
          business_type: "barbershop",
        },
        expectedField: "phone",
        expectedMessage: /telefone|fone|inválido/i,
      },
      {
        name: "business_type inválido deve retornar erro específico",
        payload: {
          email: "joao@gmail.com",
          password: "Senha123!",
          display_name: "João Silva",
          full_name: "João Silva",
          phone: "+5511999999999",
          business_type: "invalid_type" as any,
        },
        expectedField: "business_type",
        expectedMessage: /tipo de negócio|barbeiro|manicure|cabelereiro/i,
      },
    ];

    for (const { name, payload, expectedField, expectedMessage } of cases) {
      it(name, async () => {
        const response = await fetchTest(`${BASE_URL}/v1/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toHaveProperty("error");
        expect(body).toHaveProperty("details");
        expect(Array.isArray(body.details)).toBe(true);

        const fieldError = body.details.find((d: any) => d.field === expectedField);
        expect(fieldError).toBeDefined();
        expect(fieldError.message).toMatch(expectedMessage);
      });
    }
  });

  describe("Login - Validation", () => {
    it("Email inválido deve retornar erro específico", async () => {
      const response = await fetchTest(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "emailsemarroba",
          password: "123456",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty("details");
      const emailError = body.details.find((d: any) => d.field === "email");
      expect(emailError).toBeDefined();
      expect(emailError.message).toMatch(/e-mail.*inválido|formato/i);
    });

    it("Senha vazia deve retornar erro", async () => {
      const response = await fetchTest(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "joao@gmail.com",
          password: "",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty("details");
      const passwordError = body.details.find((d: any) => d.field === "password");
      expect(passwordError).toBeDefined();
      expect(passwordError.message).toMatch(/senha.*obrigatória|digite/i);
    });
  });
});
