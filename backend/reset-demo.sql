-- reset-demo.sql
-- Removes the demo data created by demo-seed.sql.
-- Uses fixed UUIDs to target only the demo records.

BEGIN;

-- 1. Delete Appointments (Depends on all others)
DELETE FROM appointments 
WHERE id IN (
  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
  'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'
);

-- 2. Delete Blocked Slots
DELETE FROM blocked_slots 
WHERE id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';

-- 3. Delete Availability Rules
DELETE FROM availability_rules 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '66666666-6666-6666-6666-666666666666'
);

-- 4. Delete Clients
DELETE FROM clients 
WHERE id IN (
  'd3b1b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d2b',
  'e4c1b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d3c'
);

-- 5. Delete Services
DELETE FROM services 
WHERE id = 'b2d9b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d1a';

-- 6. Delete Professional (Root record)
DELETE FROM professionals 
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

COMMIT;
