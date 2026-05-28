-- Enable btree_gist for exclusion constraints on non-range types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Update appointments table to use start and end for exclusion constraint
ALTER TABLE appointments RENAME COLUMN scheduled_at TO scheduled_start;
ALTER TABLE appointments ADD COLUMN scheduled_end TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN rescheduled_from_appointment_id UUID REFERENCES appointments(id);

-- Backfill scheduled_end for existing appointments
UPDATE appointments a
SET scheduled_end = a.scheduled_start + (s.duration_minutes || ' minutes')::interval
FROM services s
WHERE a.service_id = s.id;

-- Ensure it's not null for future inserts
ALTER TABLE appointments ALTER COLUMN scheduled_end SET NOT NULL;

-- 1. Exclusion Constraint for confirmed appointments
-- We use a partial index to only prevent overlap between active (confirmed) appointments
ALTER TABLE appointments
ADD CONSTRAINT appointments_overlap_exclude
EXCLUDE USING gist (
  professional_id WITH =,
  tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
)
WHERE (status = 'confirmed');

-- 2. Exclusion Constraint for blocked_slots
ALTER TABLE blocked_slots
ADD CONSTRAINT blocked_slots_overlap_exclude
EXCLUDE USING gist (
  professional_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
);
