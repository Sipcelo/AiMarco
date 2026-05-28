-- SQL Validation Phase 3.5 (REFINED v2)
BEGIN;

-- 1. Setup Dummy Data
INSERT INTO professionals (
    id, full_name, slug, phone, business_type, timezone, 
    slot_interval_minutes, minimum_booking_notice_minutes,
    opening_time, closing_time
)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Prof Validação', 
    'prof-val', 
    '11988887777', 
    'barbershop', 
    'America/Sao_Paulo', 
    15, 
    30, 
    '09:00:00', 
    '18:00:00'
)
ON CONFLICT (id) DO UPDATE SET 
    opening_time = '09:00:00', 
    closing_time = '18:00:00';

INSERT INTO services (id, professional_id, name, duration_minutes, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002', 
    '00000000-0000-0000-0000-000000000001', 
    'Corte (60 min)', 
    60,
    true
)
ON CONFLICT (id) DO UPDATE SET duration_minutes = 60, is_active = true;

INSERT INTO clients (id, professional_id, full_name, phone)
VALUES (
    '00000000-0000-0000-0000-000000000003', 
    '00000000-0000-0000-0000-000000000001', 
    'Cliente Teste', 
    '11999998888'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Initial State (Slots at 2026-03-26)
SELECT '--- SLOTS INICIAIS ---' AS info;
SELECT available_time FROM get_available_slots_v1(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '2026-03-26'
) WHERE available_time IN ('10:00', '10:15', '10:30', '10:45');

-- 3. Create Appointment (10:00 AM)
-- 10:00 AM America/Sao_Paulo is 13:00 UTC
INSERT INTO appointments (professional_id, service_id, client_id, scheduled_start, scheduled_end, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '2026-03-26 13:00:00+00', 
    '2026-03-26 14:00:00+00',
    'confirmed'
);

-- 4. Verification Check
SELECT '--- SLOTS APÓS AGENDAMENTO ---' AS info;
SELECT available_time FROM get_available_slots_v1(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '2026-03-26'
) WHERE available_time IN ('10:00', '10:15', '10:30', '10:45');

-- 5. Additional Check (Overlaps from Before)
SELECT '--- SLOTS SOBREPOSTOS ANTERIORES (09:15-09:45) ---' AS info;
SELECT available_time FROM get_available_slots_v1(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '2026-03-26'
) WHERE available_time IN ('09:15', '09:30', '09:45');

ROLLBACK; -- Don't leave test data in the DB
