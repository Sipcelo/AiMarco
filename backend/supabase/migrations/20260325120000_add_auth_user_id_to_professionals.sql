-- Migration: add auth_user_id to professionals
-- Task: A1 — Auth Setup
-- Date: 2026-03-25
--
-- Adds the bridge column between Supabase Auth (auth.users) and our domain model.
-- professionals.id stays untouched — all FK references (services, appointments,
-- blocked_slots, etc.) remain intact.

ALTER TABLE professionals
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);

CREATE INDEX idx_professionals_auth_user_id ON professionals(auth_user_id);

-- Rollback (use only if needed — drops index first to avoid constraint error):
-- DROP INDEX IF EXISTS idx_professionals_auth_user_id;
-- ALTER TABLE professionals DROP COLUMN auth_user_id;

-- ---------------------------------------------------------------------------
-- PLAN B — use only if the REFERENCES auth.users(id) FK fails in this env
-- (Supabase SQL Editor required; external clients may not resolve auth schema)
--
-- ALTER TABLE professionals
--   ADD COLUMN auth_user_id UUID UNIQUE;
-- CREATE INDEX idx_professionals_auth_user_id ON professionals(auth_user_id);
-- ---------------------------------------------------------------------------

-- After running this migration, link existing demo professionals manually:
-- UPDATE professionals SET auth_user_id = '<auth_user_uuid>' WHERE slug = 'demo-professional';
-- (Onboarding task B4 will automate this for new signups.)
