-- Add profile fields to professionals table
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS slot_interval_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS minimum_booking_notice_minutes INTEGER NOT NULL DEFAULT 30;

-- Update display_name with full_name for existing records if display_name is null
UPDATE professionals SET display_name = full_name WHERE display_name IS NULL;
