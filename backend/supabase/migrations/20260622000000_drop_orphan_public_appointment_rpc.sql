-- Remove RPC orfa: nunca chamada por backend/web/mobile (achado M4/M6).
-- SECURITY DEFINER sem rate limit proprio: superficie de ataque morta via PostgREST.
DROP FUNCTION IF EXISTS create_public_appointment_v1(UUID, UUID, TIMESTAMPTZ, TEXT, TEXT);
