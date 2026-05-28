-- Ensure no overlapping working segments for the same professional on the same day
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Postgres doesn't have a built-in timerange, so we define one
CREATE TYPE timerange AS RANGE (subtype = time);
ALTER TABLE availability_rules
ADD CONSTRAINT availability_rules_overlap_exclude
EXCLUDE USING gist (
  professional_id WITH =,
  day_of_week WITH =,
  timerange(start_time, end_time, '[)') WITH &&
);
