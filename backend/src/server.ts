import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { config } from "./config.js";
import { adaptHandler } from "./lib/fastify-adapter.js";
import authPlugin from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Frontend assets location:
// - Dockerfile: stage 3 copies web/dist -> ./public (runtime root)
// - Workspace/dev: ../../web/dist relative to backend/src/
const PUBLIC_DIR = fs.existsSync(path.resolve('/app/public'))
  ? '/app/public'
  : path.resolve(__dirname, '../../web/dist');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');
const hasFrontend = fs.existsSync(INDEX_HTML);

// Handlers
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

// Services CRUD Handlers
import { listServices } from "./routes/v1/services/list-services.js";
import { createService } from "./routes/v1/services/create-service.js";
import { updateService } from "./routes/v1/services/update-service.js";
import { deleteService } from "./routes/v1/services/delete-service.js";

// Profile Handlers
import { getProfile } from "./routes/v1/profile/get-profile.js";
import { updateProfile } from "./routes/v1/profile/update-profile.js";
import { updatePushTokenHandler } from "./routes/v1/professionals/update-push-token.js";

// Public Handlers
import { getPublicProfile } from "./routes/v1/public/get-public-profile.js";
import { getPublicAvailability } from "./routes/v1/public/get-public-availability.js";

// Auth Handlers
import { signupHandler } from "./routes/v1/auth/signup.js";
import { loginHandler } from "./routes/v1/auth/login.js";

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.railway\.app$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/aimarco\.com\.br$/,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some(r => r.test(origin));
}

const fastify = Fastify({
  logger: true,
});

// Register CORS (primeiro, antes de tudo)
await fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin || isAllowedOrigin(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// adaptHandler escreve em reply.raw (ServerResponse) diretamente, bypassando onSend.
// preHandler roda antes do handler e já seta os headers no raw response.
fastify.addHook('preHandler', (_request, reply, done) => {
  const origin = _request.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    reply.raw.setHeader('Access-Control-Allow-Origin', origin);
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    reply.raw.setHeader('Vary', 'Origin');
  }
  done();
});

// onSend como fallback para rotas nativas Fastify (que não usam adaptHandler)
fastify.addHook('onSend', (_request, reply, _payload, done) => {
  const origin = _request.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    void reply.header('Access-Control-Allow-Origin', origin);
    void reply.header('Access-Control-Allow-Credentials', 'true');
    void reply.header('Vary', 'Origin');
  }
  done();
});

// Register rate limiting plugin
await fastify.register(rateLimit, {
  global: false,
  errorResponseBuilder: () => ({
    error: "Muitas requisições. Aguarde um momento antes de tentar novamente.",
  }),
});

// Register authentication plugin
await fastify.register(authPlugin);

// Health check (public)
fastify.get("/health", async (_request, _reply) => {
  return { status: "ok" };
});

// Auth (public)
fastify.post("/v1/auth/signup", adaptHandler(signupHandler));
fastify.post("/v1/auth/login", adaptHandler(loginHandler));

// Availability (public)
fastify.get("/v1/availability/:id", adaptHandler(getAvailabilityHandler));

// Public Profile & Availability (public)
fastify.get("/v1/public/professional/:id", adaptHandler(getPublicProfile));
fastify.get(
  "/v1/public/professional/:id/availability",
  adaptHandler(getPublicAvailability),
);

// Appointments (Public — with rate limit)
fastify.post<{ Body?: unknown }>(
  "/v1/appointments",
  {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
        keyGenerator: (request) => request.ip || "unknown",
      },
    },
  },
  adaptHandler(createAppointmentHandler),
);

// Public appointments v2 (with rate limit)
fastify.post<{ Body?: unknown }>(
  "/v1/public/appointments",
  {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
        keyGenerator: (request) => request.ip || "unknown",
      },
    },
  },
  adaptHandler(createAppointmentHandler),
);

// Appointments (Protected)
fastify.post(
  "/v1/appointments/:id/cancel",
  adaptHandler(cancelAppointmentHandler),
);
fastify.post(
  "/v1/appointments/:id/reschedule",
  adaptHandler(rescheduleAppointment),
);
fastify.post("/v1/appointments/:id/status", adaptHandler(updateStatusHandler));

// Professionals (Protected)
fastify.get(
  "/v1/professionals/:id/appointments",
  adaptHandler(listAppointmentsHandler),
);
fastify.get(
  "/v1/professionals/:id/available-days",
  adaptHandler(getAvailableDaysHandler),
);
fastify.get(
  "/v1/professionals/:id/blocked-slots",
  adaptHandler(listBlockedSlotsHandler),
);
fastify.post(
  "/v1/professionals/:id/blocked-slots",
  adaptHandler(createBlockedSlotHandler),
);
fastify.put(
  "/v1/professionals/:id/push-token",
  adaptHandler(updatePushTokenHandler),
);

// Availability Rules (Protected)
fastify.get(
  "/v1/professionals/:id/availability",
  adaptHandler(listAvailabilityRules),
);
fastify.post(
  "/v1/professionals/:id/availability",
  adaptHandler(createAvailabilityRules),
);
fastify.put(
  "/v1/professionals/:id/availability-rules/:rid",
  adaptHandler(updateSingleAvailabilityRule),
);
fastify.delete(
  "/v1/professionals/:id/availability-rules/:rid",
  adaptHandler(deleteAvailabilityRule),
);

// Services CRUD (Protected)
fastify.get("/v1/professionals/:id/services", adaptHandler(listServices));
fastify.post("/v1/professionals/:id/services", adaptHandler(createService));
fastify.patch(
  "/v1/professionals/:id/services/:serviceId",
  adaptHandler(updateService),
);
fastify.delete(
  "/v1/professionals/:id/services/:serviceId",
  adaptHandler(deleteService),
);

// Profile (Protected)
fastify.get("/v1/professionals/:id/profile", adaptHandler(getProfile));
fastify.patch("/v1/professionals/:id/profile", adaptHandler(updateProfile));

// ─── Serve frontend SPA (DEVE ser o último) ──────────────────────
if (hasFrontend) {
  // Serve JS/CSS bundles: /assets/index-xxx.js, /assets/index-xxx.css
  await fastify.register(staticFiles, {
    root: path.join(PUBLIC_DIR, 'assets'),
    prefix: '/assets/',
    decorateReply: false,
  });

  // Serve static images: /img/logo.png etc.
  await fastify.register(staticFiles, {
    root: path.join(PUBLIC_DIR, 'img'),
    prefix: '/img/',
    decorateReply: false,
  });

  // Serve index.html para / e qualquer rota não-API (SPA fallback)
  const indexHtml = fs.readFileSync(INDEX_HTML, 'utf-8');
  fastify.get('/', (_request, reply) => {
    reply.type('text/html').send(indexHtml);
  });
  fastify.setNotFoundHandler((_request, reply) => {
    reply.type('text/html').send(indexHtml);
  });
} else {
  console.warn('⚠️  Frontend não encontrado em:', PUBLIC_DIR);
}

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: config.PORT,
      host: '0.0.0.0'
    });
    console.log(`🚀 Server live on port ${config.PORT}`);
  } catch (err) {
    console.error('Falha no boot:', err);
    process.exit(1);
  }
};
start();
