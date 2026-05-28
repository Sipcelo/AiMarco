-- Migration: Add description to services (Phase 3.5)
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
