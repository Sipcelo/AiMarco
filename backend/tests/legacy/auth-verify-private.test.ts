/**
 * auth-verify-private.test.ts
 *
 * Unit tests for verifyPrivate and verifyPrivateAAL2 — the auth helpers
 * used on routes where no explicit professionalId is in the URL.
 *
 * Covers: happy paths, error paths, AAL2 enforcement, and network
 * failure handling (Supabase crash scenarios).
 *
 * TODO: reescrever testes para novo auth model (authPlugin + request.auth)
 * Estes testes dependem de lib/auth.ts (removido por contaminação Parse Server).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { verifyPrivate, verifyPrivateAAL2 } from "../../src/lib/auth";
import { supabase } from "../../src/lib/supabase";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRequest(authorization?: string): any {
  const req = new EventEmitter() as any;
  req.headers = authorization ? { authorization } : {};
  return req;
}

function fakeJwt(payload: Record<string, unknown>): string {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${h}.${b}.sig`;
}

// ─── verifyPrivate ────────────────────────────────────────────────────────────

describe.skip("verifyPrivate — happy paths", () => {
  afterEach(() => vi.restoreAllMocks());

  it("VP-1: valid token returns userId and professionalId", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "auth-user-1" } as any },
      error: null,
    });
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: "prof-1" }, error: null }),
        }),
      }),
    } as any);

    const req = makeRequest("Bearer valid-token");
    const result = await verifyPrivate(req);

    expect(result.error).toBeUndefined();
    expect(result.userId).toBe("auth-user-1");
    expect(result.professionalId).toBe("prof-1");
  });

  it("VP-2: auth_user_id IS the bridge — DB lookup uses that field", async () => {
    // Validates the implicit join: auth user → professional via auth_user_id
    const fromSpy = vi.fn().mockReturnValue({
      select: () => ({
        eq: (field: string, value: string) => {
          // Must query by auth_user_id, not by user.id as string "id"
          expect(field).toBe("auth_user_id");
          expect(value).toBe("bridge-user-id");
          return {
            single: () =>
              Promise.resolve({ data: { id: "prof-bridge" }, error: null }),
          };
        },
      }),
    });

    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "bridge-user-id" } as any },
      error: null,
    });
    vi.spyOn(supabase, "from").mockImplementation(fromSpy);

    const req = makeRequest("Bearer valid-bridge");
    const result = await verifyPrivate(req);

    expect(result.professionalId).toBe("prof-bridge");
  });
});

describe.skip("verifyPrivate — error paths", () => {
  afterEach(() => vi.restoreAllMocks());

  it("VP-3: missing Authorization header → 401", async () => {
    const req = makeRequest();
    const result = await verifyPrivate(req);
    expect(result.error!.status).toBe(401);
  });

  it("VP-4: header without Bearer prefix → 401", async () => {
    const req = makeRequest("Token abc");
    const result = await verifyPrivate(req);
    expect(result.error!.status).toBe(401);
  });

  it("VP-5: Supabase returns null user → 401", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const req = makeRequest("Bearer expired-token");
    const result = await verifyPrivate(req);
    expect(result.error!.status).toBe(401);
  });

  it("VP-6: Supabase returns error → 401", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: { message: "invalid JWT", status: 401 } as any,
    });
    const req = makeRequest("Bearer bad-token");
    const result = await verifyPrivate(req);
    expect(result.error!.status).toBe(401);
  });

  it("VP-7: DB lookup for professional fails → 403", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "orphan-user" } as any },
      error: null,
    });
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: { message: "row not found" },
            }),
        }),
      }),
    } as any);
    const req = makeRequest("Bearer orphan-token");
    const result = await verifyPrivate(req);
    expect(result.error!.status).toBe(403);
  });

  it("VP-8: DB returns null professional → 403", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "no-prof-user" } as any },
      error: null,
    });
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    } as any);
    const req = makeRequest("Bearer valid-but-no-prof");
    const result = await verifyPrivate(req);
    expect(result.error!.status).toBe(403);
  });

  it("VP-9: unexpected exception → returns 500, never throws", async () => {
    vi.spyOn(supabase.auth, "getUser").mockRejectedValue(
      new Error("connection refused")
    );
    const req = makeRequest("Bearer crash-token");
    // Must NOT throw — must return gracefully
    await expect(verifyPrivate(req)).resolves.toMatchObject({
      error: { status: 500 },
    });
  });

  it("VP-10: Bearer with empty token string → 401", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: { message: "empty JWT", status: 401 } as any,
    });
    const req = makeRequest("Bearer ");
    const result = await verifyPrivate(req);
    expect(result.error!.status).toBe(401);
  });
});

// ─── verifyPrivateAAL2 ────────────────────────────────────────────────────────

describe.skip("verifyPrivateAAL2 — MFA enforcement", () => {
  afterEach(() => vi.restoreAllMocks());

  function mockValidUser(profId = "prof-mfa") {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "mfa-user" } as any },
      error: null,
    });
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { id: profId }, error: null }),
        }),
      }),
    } as any);
  }

  it("VPA-1: aal2 claim → success", async () => {
    mockValidUser();
    const token = fakeJwt({ sub: "mfa-user", aal: "aal2" });
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error).toBeUndefined();
    expect(result.userId).toBe("mfa-user");
  });

  it("VPA-2: aal1 claim → 403 MFA required", async () => {
    mockValidUser();
    const token = fakeJwt({ sub: "mfa-user", aal: "aal1" });
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error!.status).toBe(403);
    expect(result.error!.message).toMatch(/dois fatores|MFA/i);
  });

  it("VPA-3: missing aal field → 403 (treated as aal1)", async () => {
    mockValidUser();
    const token = fakeJwt({ sub: "mfa-user" }); // no aal field
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error!.status).toBe(403);
  });

  it("VPA-4: blank aal field → 403", async () => {
    mockValidUser();
    const token = fakeJwt({ sub: "mfa-user", aal: "" });
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error!.status).toBe(403);
  });

  it("VPA-5: malformed JWT (2 segments) → 401 malformed token", async () => {
    mockValidUser();
    const token = "header.onlypayload"; // 2 parts
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error!.status).toBe(401);
    expect(result.error!.message).toMatch(/malformado/i);
  });

  it("VPA-6: non-base64 payload → 500 graceful error", async () => {
    mockValidUser();
    const token = "header.=NOT=BASE64=VALID=.sig"; // bad base64
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error).toBeDefined();
    expect([401, 500]).toContain(result.error!.status);
  });

  it("VPA-7: Supabase crashes during base verifyPrivate → 500, no unhandled exception", async () => {
    vi.spyOn(supabase.auth, "getUser").mockRejectedValue(new Error("network"));
    const token = fakeJwt({ aal: "aal2" });
    const req = makeRequest(`Bearer ${token}`);
    await expect(verifyPrivateAAL2(req)).resolves.toMatchObject({
      error: { status: 500 },
    });
  });

  it("VPA-8: base auth fails (invalid user) → AAL2 check never runs", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const token = fakeJwt({ aal: "aal2" });
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    // Must fail at step 1 (401), not proceed to AAL2 check
    expect(result.error!.status).toBe(401);
  });

  it("VPA-9: aal2 token AND professional not found → 403 from base auth", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "ghost-user" } as any },
      error: null,
    });
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: null, error: { message: "not found" } }),
        }),
      }),
    } as any);
    const token = fakeJwt({ sub: "ghost-user", aal: "aal2" });
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error!.status).toBe(403);
    expect(result.error!.message).toMatch(/Profissional não encontrado/i);
  });

  it("VPA-10: response never contains userId when error is present", async () => {
    // Any error scenario must not leak userId alongside the error
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const token = fakeJwt({ aal: "aal2" });
    const req = makeRequest(`Bearer ${token}`);
    const result = await verifyPrivateAAL2(req);
    expect(result.error).toBeDefined();
    expect(result.userId).toBeUndefined();
  });
});
