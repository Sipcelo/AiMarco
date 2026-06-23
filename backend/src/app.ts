import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { adaptHandler } from "./lib/fastify-adapter.js";
import authPlugin from "./middleware/auth.js";
import { supabase } from "./lib/supabase.js";

// Route handlers
import { getAvailabilityHandler } from "./routes/v1/availability/get-availability.js";
import { listAvailabilityRules } from "./routes/v1/availability/list-rules.js";
import { createAvailabilityRules } from "./routes/v1/availability/update-rules.js";
import { updateSingleAvailabilityRule } from "./routes/v1/availability/update-rule.js";
import { deleteAvailabilityRule } from "./routes/v1/availability/delete-rule.js";
import { createAppointmentHandler } from "./routes/v1/appointments/create-appointment.js";
import { cancelAppointmentHandler } from "./routes/v1/appointments/cancel-appointment.js";
import { rescheduleAppointment } from "./routes/v1/appointments/reschedule-appointment.js";
import { updateStatusHandler } from "./routes/v1/appointments/update-status.js";
import { listAppointmentsHandler } from "./routes/v1/professionals/list-appointments.js";
import { getAvailableDaysHandler } from "./routes/v1/professionals/get-available-days.js";
import { listBlockedSlotsHandler } from "./routes/v1/professionals/list-blocked-slots.js";
import { createBlockedSlotHandler } from "./routes/v1/professionals/create-blocked-slot.js";
import { listServices } from "./routes/v1/services/list-services.js";
import { createService } from "./routes/v1/services/create-service.js";
import { updateService } from "./routes/v1/services/update-service.js";
import { deleteService } from "./routes/v1/services/delete-service.js";
import { getProfile } from "./routes/v1/profile/get-profile.js";
import { updateProfile } from "./routes/v1/profile/update-profile.js";
import { updatePushTokenHandler } from "./routes/v1/professionals/update-push-token.js";
import { getPublicProfile } from "./routes/v1/public/get-public-profile.js";
import { getPublicAvailability } from "./routes/v1/public/get-public-availability.js";
import { signupHandler } from "./routes/v1/auth/signup.js";
import { loginHandler } from "./routes/v1/auth/login.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PUBLIC_DIR = fs.existsSync(path.resolve("/app/public"))
  ? "/app/public"
  : path.resolve(__dirname, "../../web/dist");
const INDEX_HTML = path.join(PUBLIC_DIR, "index.html");

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.railway\.app$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/aimarco\.com\.br$/,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some((r) => r.test(origin));
}

export interface BuildAppOptions {
  logger?: boolean;
  serveStatic?: boolean;
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { logger = true, serveStatic = true } = opts;

  const fastify = Fastify({ logger });

  // Tolerate empty JSON bodies on POST/PUT (e.g. cancel appointment sends no body
  // but the client sets Content-Type: application/json). Without this, Fastify's
  // default parser rejects an empty body with FST_ERR_CTP_EMPTY_JSON_BODY (400).
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      const raw = (body as string).trim();
      if (raw.length === 0) {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(raw));
      } catch (err) {
        (err as any).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || isAllowedOrigin(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  fastify.addHook("preHandler", (_request, reply, done) => {
    const origin = _request.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
      reply.raw.setHeader("Vary", "Origin");
    }
    done();
  });

  fastify.addHook("onSend", (_request, reply, _payload, done) => {
    // Cabeçalhos de segurança aplicados a TODAS as respostas.
    // Base legal: LGPD art. 46 (proteção contra acessos não autorizados) e
    // Guia ANPD Pequeno Porte §52-53 (segurança das comunicações / dados em trânsito).
    // ponytail: 4 headers no hook existente em vez de adicionar @fastify/helmet.
    void reply.header("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    void reply.header("X-Content-Type-Options", "nosniff");
    void reply.header("X-Frame-Options", "DENY");
    void reply.header("Referrer-Policy", "strict-origin-when-cross-origin");

    const origin = _request.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      void reply.header("Access-Control-Allow-Origin", origin);
      void reply.header("Access-Control-Allow-Credentials", "true");
      void reply.header("Vary", "Origin");
    }
    done();
  });

  await fastify.register(rateLimit, {
    global: false,
    // O plugin faz `throw errorResponseBuilder(...)`. Sem `statusCode` no objeto,
    // o error handler do Fastify cai no default 500. Propagar context.statusCode
    // (429, ou 403 em ban) garante o código correto, preservando a mensagem em `error`.
    errorResponseBuilder: (_req, context) => ({
      statusCode: context.statusCode,
      error: "Muitas requisições. Aguarde um momento antes de tentar novamente.",
    }),
  });

  await fastify.register(authPlugin);

  // Health check (liveness barato — usado pelo Railway). Só prova que o HTTP está no ar.
  fastify.get("/health", async () => ({ status: "ok" }));

  // Readiness profundo para monitor externo (UptimeRobot/Better Stack): alerta no não-200.
  // Cobre DB fora (503) e worker morto/travado — notifications presas em pending/processing > 5 min (503).
  fastify.get("/health/ready", async (_req, reply) => {
    const STUCK_MINUTES = 5;
    const cutoff = new Date(Date.now() - STUCK_MINUTES * 60 * 1000).toISOString();
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "processing"])
        .lt("created_at", cutoff);

      if (error) {
        reply.code(503);
        return { status: "degraded", db: "error", stuck_notifications: null };
      }

      const stuck = count ?? 0;
      const healthy = stuck === 0;
      reply.code(healthy ? 200 : 503);
      return { status: healthy ? "ok" : "degraded", db: "ok", stuck_notifications: stuck };
    } catch {
      reply.code(503);
      return { status: "degraded", db: "unreachable", stuck_notifications: null };
    }
  });

  // Auth (public)
  fastify.post("/v1/auth/signup", adaptHandler(signupHandler));
  fastify.post("/v1/auth/login", adaptHandler(loginHandler));

  // Availability (public)
  fastify.get("/v1/availability/:id", adaptHandler(getAvailabilityHandler));

  // Public Profile & Availability
  fastify.get("/v1/public/professional/:id", adaptHandler(getPublicProfile));
  fastify.get(
    "/v1/public/professional/:id/availability",
    adaptHandler(getPublicAvailability),
  );

  // Appointments (public, rate-limited)
  const bookingRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
        keyGenerator: (request: { ip?: string }) => request.ip ?? "unknown",
      },
    },
  };
  fastify.post<{ Body?: unknown }>(
    "/v1/appointments",
    bookingRateLimit,
    adaptHandler(createAppointmentHandler),
  );
  fastify.post<{ Body?: unknown }>(
    "/v1/public/appointments",
    bookingRateLimit,
    adaptHandler(createAppointmentHandler),
  );

  // Appointments (protected)
  fastify.post("/v1/appointments/:id/cancel", adaptHandler(cancelAppointmentHandler));
  fastify.post("/v1/appointments/:id/reschedule", adaptHandler(rescheduleAppointment));
  fastify.post("/v1/appointments/:id/status", adaptHandler(updateStatusHandler));

  // Professionals (protected)
  fastify.get("/v1/professionals/:id/appointments", adaptHandler(listAppointmentsHandler));
  fastify.get("/v1/professionals/:id/available-days", adaptHandler(getAvailableDaysHandler));
  fastify.get("/v1/professionals/:id/blocked-slots", adaptHandler(listBlockedSlotsHandler));
  fastify.post("/v1/professionals/:id/blocked-slots", adaptHandler(createBlockedSlotHandler));
  fastify.put("/v1/professionals/:id/push-token", adaptHandler(updatePushTokenHandler));

  // Availability Rules (protected)
  fastify.get("/v1/professionals/:id/availability", adaptHandler(listAvailabilityRules));
  fastify.post("/v1/professionals/:id/availability", adaptHandler(createAvailabilityRules));
  fastify.put("/v1/professionals/:id/availability-rules/:rid", adaptHandler(updateSingleAvailabilityRule));
  fastify.delete("/v1/professionals/:id/availability-rules/:rid", adaptHandler(deleteAvailabilityRule));

  // Services CRUD (protected)
  fastify.get("/v1/professionals/:id/services", adaptHandler(listServices));
  fastify.post("/v1/professionals/:id/services", adaptHandler(createService));
  fastify.patch("/v1/professionals/:id/services/:serviceId", adaptHandler(updateService));
  fastify.delete("/v1/professionals/:id/services/:serviceId", adaptHandler(deleteService));

  // Profile (protected)
  fastify.get("/v1/professionals/:id/profile", adaptHandler(getProfile));
  fastify.patch("/v1/professionals/:id/profile", adaptHandler(updateProfile));

  // Frontend SPA (last, only in production)
  if (serveStatic && fs.existsSync(INDEX_HTML)) {
    await fastify.register(staticFiles, {
      root: path.join(PUBLIC_DIR, "assets"),
      prefix: "/assets/",
      decorateReply: false,
    });
    await fastify.register(staticFiles, {
      root: path.join(PUBLIC_DIR, "img"),
      prefix: "/img/",
      decorateReply: false,
    });
    const indexHtml = fs.readFileSync(INDEX_HTML, "utf-8");
    fastify.get("/", (_request, reply) => {
      reply.type("text/html").send(indexHtml);
    });
    fastify.setNotFoundHandler((_request, reply) => {
      reply.type("text/html").send(indexHtml);
    });
  }

  return fastify;
}
