-- demo-seed.sql
-- Seed data for manual testing and demonstration of the AiMarco API.
-- Uses fixed UUIDs for repeatability.

BEGIN;

-- 1. Create a Professional
INSERT INTO professionals (id, full_name, phone, email, business_type, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'John Barber',
  '+5511999999999',
  'john@barber.com',
  'barbershop',
  '2026-03-01 10:00:00+00'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create an Active Service
INSERT INTO services (id, professional_id, name, duration_minutes, price_cents, is_active, created_at)
VALUES (
  'b2d9b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d1a',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Classic Haircut',
  30,
  5000,
  TRUE,
  '2026-03-01 10:00:00+00'
) ON CONFLICT (id) DO NOTHING;

-- 3. Create Availability Rules (Working Hours)
-- 0 = Sunday, 1 = Monday, 6 = Saturday
INSERT INTO availability_rules (id, professional_id, day_of_week, start_time, end_time, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 1, '09:00', '18:00', '2026-03-01 10:00:00+00'),
  ('22222222-2222-2222-2222-222222222222', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 2, '09:00', '18:00', '2026-03-01 10:00:00+00'),
  ('33333333-3333-3333-3333-333333333333', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 3, '09:00', '18:00', '2026-03-01 10:00:00+00'),
  ('44444444-4444-4444-4444-444444444444', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 4, '09:00', '18:00', '2026-03-01 10:00:00+00'),
  ('55555555-5555-5555-5555-555555555555', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 5, '09:00', '18:00', '2026-03-01 10:00:00+00'),
  ('66666666-6666-6666-6666-666666666666', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 6, '10:00', '14:00', '2026-03-01 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 4. Create Clients
INSERT INTO clients (id, professional_id, full_name, phone, created_at)
VALUES 
  ('d3b1b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d2b', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Alice Client', '+5511888888888', '2026-03-01 10:00:00+00'),
  ('e4c1b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d3c', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Bob Client', '+5511777777777', '2026-03-01 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 5. Create Blocked Slot (e.g., Lunch break on 2026-03-23)
INSERT INTO blocked_slots (id, professional_id, starts_at, ends_at, reason, created_at)
VALUES (
  'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '2026-03-23 12:00:00+00',
  '2026-03-23 13:00:00+00',
  'Lunch Break',
  '2026-03-01 10:00:00+00'
) ON CONFLICT (id) DO NOTHING;

-- 6. Create Confirmed Appointments (Monday 2026-03-23)
INSERT INTO appointments (id, professional_id, service_id, client_id, scheduled_at, status, created_at)
VALUES 
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'b2d9b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d1a', 'd3b1b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d2b', '2026-03-23 09:00:00+00', 'confirmed', '2026-03-01 10:00:00+00'),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'b2d9b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d1a', 'e4c1b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d3c', '2026-03-23 10:00:00+00', 'confirmed', '2026-03-01 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

COMMIT;
