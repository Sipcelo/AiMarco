/**
 * auth-injection.test.ts
 *
 * Security-focused tests: SQL injection via URL params, JWT privilege
 * escalation, malformed tokens, and header-injection payloads.
 *
 * Uses fastify.inject() — no network ports. Tests the real authPlugin +
 * adaptHandler stack with mocked Supabase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/middleware/auth.js";
import { adaptHandler } from "../../src/lib/fastify-adapter.js";
import { supabase } from "../../src/lib/supabase.js";
import type { IncomingMessage, ServerResponse } from "http";

// ─── Handlers with ownership checks ──────────────────────────────────────────
import { listAvailabilityRules } from "../../src/routes/v1/availability/list-rules.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Echo handler that returns auth context + params (no ownership check — for JWT/header tests). */
async function echoHandler(
  req: IncomingMessage & { auth?: any },
  res: ServerResponse,
  params: Record<string, string>,
) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ auth: req.auth, params }));
}

/** Build a fresh Fastify instance for each suite. */
async function buildTestApp() {
  const fastify = Fastify({ logger: false });
  await fastify.register(authPlugin);
  fastify.get("/v1/professionals/:id/echo", adaptHandler(echoHandler));
  await fastify.ready();
  return fastify;
}

/**
 * Build an app with listAvailabilityRules (which performs ownership checks).
 * Used for SQL injection and PE-3 tests where we need to verify ownership rejection.
 */
async function buildOwnershipTestApp() {
  const fastify = Fastify({ logger: false });
  await fastify.register(authPlugin);
  fastify.get(
    "/v1/professionals/:id/availability",
    adaptHandler(listAvailabilityRules),
  );
  await fastify.ready();
  return fastify;
}

/** Build a fake base64url-encoded JWT payload for testing header parsing only. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake_signature`;
}

const VALID_USER_ID = "legit-user-id";
const REAL_PROF_ID = "real-prof-id";

/** Default mock: getUser succeeds, professional lookup succeeds. */
function mockValidAuth() {
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id: VALID_USER_ID } } as any,
    error: null,
  });
  vi.spyOn(supabase, "from").mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({ data: { id: REAL_PROF_ID }, error: null }),
      }),
    }),
  } as any);
}

// ─── SQL Injection via URL param ──────────────────────────────────────────────

describe("SQL Injection — professionalId URL parameter", () => {
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE professionals; --",
    "1 UNION SELECT id FROM professionals --",
    "admin'--",
    "\" OR \"\"=\"",
    "1; EXEC xp_cmdshell('dir') --",
    "' OR 1=1 #",
    "%27%20OR%20%271%27%3D%271",
    "\\x27 OR 1=1 --",
    "' WAITFOR DELAY '0:0:5' --",
  ];

  beforeEach(() => mockValidAuth());
  afterEach(() => vi.restoreAllMocks());

  sqlPayloads.forEach((payload, idx) => {
    it(`SQL-${idx + 1}: injection via professionalId "${payload.substring(0, 30)}" is rejected (403)`, async () => {
      const app = await buildOwnershipTestApp();
      const res = await app.inject({
        method: "GET",
        url: `/v1/professionals/${encodeURIComponent(payload)}/availability`,
        headers: { authorization: "Bearer valid-token" },
      });

      // authPlugin attaches the DB-professionalId. Handler checks
      // auth.professionalId !== params.id → 403 (ownership mismatch).
      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error).toMatch(/permissão/i);
    });
  });

  it("SQL: valid professionalId returns 200 with auth context", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/${REAL_PROF_ID}/echo`,
      headers: { authorization: "Bearer valid-token" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.auth).toBeDefined();
    expect(body.auth.userId).toBe(VALID_USER_ID);
    expect(body.auth.professionalId).toBe(REAL_PROF_ID);
    expect(body.params.id).toBe(REAL_PROF_ID);
  });
});

// ─── JWT Manipulation / Privilege Escalation ──────────────────────────────────

describe("JWT Privilege Escalation — malformed and crafted tokens", () => {
  afterEach(() => vi.restoreAllMocks());

  it("PE-1: invalid token string returns 401 (Supabase rejects it)", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token", status: 401 } as any,
    });

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/any-id/echo`,
      headers: { authorization: "Bearer not.a.valid.jwt" },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toMatch(/Token inválido|Token inv.lido|expirado/i);
  });

  it("PE-2: crafted token with fake fields is rejected by Supabase (401)", async () => {
    // Supabase validates server-side — a crafted JWT with fake claims won't
    // match any real session, so getUser returns null/error.
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: { message: "JWT malformed", status: 401 } as any,
    });

    const token = fakeJwt({ sub: "attacker", role: "admin", aal: "aal2" });
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/victim-id/echo`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(401);
  });

  it("PE-3: token of another user passes auth but data is isolated (handler-level 403)", async () => {
    // Simulate: token is valid but belongs to a different professional
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "other-user-id" } } as any,
      error: null,
    });
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { id: "other-prof-id" }, error: null }),
        }),
      }),
    } as any);

    const app = await buildOwnershipTestApp();
    // Requesting victim-prof-id but authPlugin found other-prof-id
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/victim-prof-id/availability`,
      headers: { authorization: "Bearer real-token-of-another-user" },
    });

    // authPlugin sets professionalId = "other-prof-id". Handler checks
    // auth.professionalId !== params.id ("victim-prof-id") → 403
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error).toMatch(/permissão/i);
  });

  it("PE-4: Supabase network crash returns 500 (not unhandled rejection)", async () => {
    vi.spyOn(supabase.auth, "getUser").mockRejectedValue(new Error("ECONNREFUSED"));

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/v1/professionals/any-id/echo`,
      headers: { authorization: "Bearer crash-token" },
    });

    // authPlugin has no catch for rejections; Fastify error handler catches it → 500
    expect(res.statusCode).toBe(500);
  });
});

// ─── Header injection payloads ────────────────────────────────────────────────

describe("Header Injection — Authorization header attack vectors", () => {
  afterEach(() => vi.restoreAllMocks());

  const headerAttacks: [string, string | undefined][] = [
    ["null byte in header", "Bearer valid\x00injected"],
    ["CRLF injection", "Bearer valid\r\nX-Injected: evil"],
    ["no Bearer prefix", "Token xyz"],
    ["empty string auth", ""],
    ["only Bearer keyword", "Bearer "],
    ["multiple Bearer tokens", "Bearer tok1 Bearer tok2"],
  ];

  headerAttacks.forEach(([name, headerValue]) => {
    it(`HA: ${name} → rejected with 401`, async () => {
      const app = await buildTestApp();
      const res = await app.inject({
        method: "GET",
        url: "/v1/professionals/any-id/echo",
        headers: headerValue ? { authorization: headerValue } : {},
      });

      // Should fail at header parsing stage, before any supabase call
      expect(res.statusCode).toBe(401);
    });
  });

  it("HA: missing Authorization header → 401", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/professionals/any-id/echo",
      headers: {},
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toMatch(/Token.*n.o fornecido|autenticação/i);
  });

  it("HA: Supabase failure propagates as 401 (not silent success)", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: { message: "network error", status: 503 } as any,
    });

    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/v1/professionals/any-id/echo",
      headers: { authorization: "Bearer some-token" },
    });

    expect(res.statusCode).toBe(401);
  });
});