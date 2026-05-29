const INTEGRATION_REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

export function requireIntegrationEnv(): { ok: boolean; missing: string[] } {
  const missing = INTEGRATION_REQUIRED.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing };
}
