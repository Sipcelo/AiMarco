-- Migration: Add snapshots to appointments (Phase 3.5)
-- As per GEMINI.md: "service and client snapshots must be stored in appointments"

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS service_name TEXT,
ADD COLUMN IF NOT EXISTS service_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Backfill snapshots for existing appointments (if any)
UPDATE appointments a
SET 
  service_name = s.name,
  service_duration_minutes = s.duration_minutes
FROM services s
WHERE a.service_id = s.id
  AND a.service_name IS NULL;

UPDATE appointments a
SET 
  client_name = c.full_name,
  client_phone = c.phone
FROM clients c
WHERE a.client_id = c.id
  AND a.client_name IS NULL;
