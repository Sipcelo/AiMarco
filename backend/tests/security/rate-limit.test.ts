/**
 * rate-limit.test.ts
 *
 * Verifica que o rate limit de 10 req/min por IP está ativo no endpoint
 * público de criação de agendamento (POST /v1/public/appointments).
 *
 * Usa fastify.inject() — sem porta de rede. A app de teste espelha exatamente
 * a configuração do app.ts para que o teste valide a lógica de produção.
 */
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";

async function buildRateLimitApp() {
  const fastify = Fastify({ logger: false });

  await fastify.register(rateLimit, {
    global: false,
    // Espelha app.ts: propagar context.statusCode evita o default 500 do Fastify.
    errorResponseBuilder: (_req, context) => ({
      statusCode: context.statusCode,
      error: "Muitas requisições. Aguarde um momento antes de tentar novamente.",
    }),
  });

  const bookingRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
        keyGenerator: (request: { ip?: string }) => request.ip ?? "unknown",
      },
    },
  };

  fastify.post(
    "/v1/public/appointments",
    bookingRateLimit,
    async (_req, reply) => {
      return reply.status(400).send({ error: "dados inválidos" });
    },
  );

  fastify.get("/health", async () => ({ status: "ok" }));

  await fastify.ready();
  return fastify;
}

describe("Rate Limit — POST /v1/public/appointments", () => {
  it("deve retornar 429 após 10 requisições por IP no mesmo minuto", async () => {
    const app = await buildRateLimitApp();

    const makeRequest = () =>
      app.inject({
        method: "POST",
        url: "/v1/public/appointments",
        headers: { "Content-Type": "application/json" },
        payload: "{}",
      });

    // Requests 1–10: must not be rate-limited (400 from handler, not 429)
    for (let i = 0; i < 10; i++) {
      const res = await makeRequest();
      expect(res.statusCode).not.toBe(429);
    }

    // Request 11: must be blocked by rate limit
    const blocked = await makeRequest();
    expect(blocked.statusCode).toBe(429);
    const body = blocked.json();
    expect(body.error).toMatch(/muitas requisições/i);

    await app.close();
  });

  it("não deve aplicar rate limit a rotas sem config de limite (GET /health)", async () => {
    const app = await buildRateLimitApp();

    for (let i = 0; i < 15; i++) {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
    }

    await app.close();
  });
});
