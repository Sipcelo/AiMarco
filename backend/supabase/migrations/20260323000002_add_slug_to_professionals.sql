-- Migration to add slug to professionals table

-- Add the slug column
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create an index to speed up slug lookups
CREATE INDEX IF NOT EXISTS professionals_slug_idx ON professionals (slug);

-- Function to generate slug
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) RETURNS TEXT AS $$
DECLARE
    new_slug TEXT;
    counter INTEGER := 1;
BEGIN
    new_slug := lower(regexp_replace(name, '\s+', '-', 'g'));
    new_slug := regexp_replace(new_slug, '[^a-z0-9-]', '', 'g');
    
    WHILE EXISTS (SELECT 1 FROM professionals WHERE slug = new_slug) LOOP
        new_slug := lower(regexp_replace(name, '\s+', '-', 'g')) || '-' || counter;
        new_slug := regexp_replace(new_slug, '[^a-z0-9-]', '', 'g');
        counter := counter + 1;
    END LOOP;
    
    RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Backfill slug for existing professionals based on full_name or display_name
UPDATE professionals 
SET slug = generate_slug(COALESCE(display_name, full_name, 'professional'))
WHERE slug IS NULL;

-- Make slug NOT NULL after backfilling
ALTER TABLE professionals ALTER COLUMN slug SET NOT NULL;
