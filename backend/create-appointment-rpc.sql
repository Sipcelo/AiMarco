CREATE OR REPLACE FUNCTION create_appointment_v1(
  p_professional_id UUID,
  p_service_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_client_name TEXT,
  p_client_phone TEXT
)
RETURNS JSON AS $$
DECLARE
  v_duration_minutes INTEGER;
  v_ends_at TIMESTAMPTZ;
  v_client_id UUID;
  v_appointment RECORD;
  v_local_scheduled_at TIMESTAMP;
  v_local_ends_at TIMESTAMP;
  v_day_of_week INTEGER;
  v_requested_time TIME;
  v_requested_end_time TIME;
  v_lock_id BIGINT;
  v_business_tz TEXT := 'America/Sao_Paulo';
BEGIN
  -- 1. Concurrency Protection: Acquire advisory transaction-level lock scoped to professional
  v_lock_id := ('x' || substr(md5(p_professional_id::text), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_id);

  -- 2. Validate service and get duration
  SELECT duration_minutes INTO v_duration_minutes
  FROM services
  WHERE id = p_service_id 
    AND professional_id = p_professional_id 
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found or does not belong to the professional.';
  END IF;

  -- 3. Compute absolute and local timestamps
  v_ends_at := p_scheduled_at + (v_duration_minutes || ' minutes')::interval;
  
  -- Convert absolute points to local wall-clock time for business rule validation
  v_local_scheduled_at := p_scheduled_at AT TIME ZONE v_business_tz;
  v_local_ends_at := v_ends_at AT TIME ZONE v_business_tz;
  
  v_day_of_week := EXTRACT(DOW FROM v_local_scheduled_at);
  v_requested_time := v_local_scheduled_at::time;
  v_requested_end_time := v_local_ends_at::time;

  -- 4. Verify the full window fits a valid availability_rule (local time logic)
  IF NOT EXISTS (
    SELECT 1 FROM availability_rules
    WHERE professional_id = p_professional_id
      AND day_of_week = v_day_of_week
      AND start_time <= v_requested_time
      AND end_time >= v_requested_end_time
      AND v_local_ends_at::date = v_local_scheduled_at::date -- Ensure it doesn't cross local days
  ) THEN
    RAISE EXCEPTION 'Selected slot is no longer available.';
  END IF;

  -- 5. Verify no overlap with blocked_slots (absolute time logic)
  IF EXISTS (
    SELECT 1 FROM blocked_slots
    WHERE professional_id = p_professional_id
      AND (p_scheduled_at, v_ends_at) OVERLAPS (starts_at, ends_at)
  ) THEN
    RAISE EXCEPTION 'Selected slot is no longer available.';
  END IF;

  -- 6. Verify no overlap with confirmed appointments (absolute time logic)
  IF EXISTS (
    SELECT 1 FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.professional_id = p_professional_id
      AND a.status = 'confirmed'
      AND (p_scheduled_at, v_ends_at) OVERLAPS (a.scheduled_at, a.scheduled_at + (s.duration_minutes || ' minutes')::interval)
  ) THEN
    RAISE EXCEPTION 'Selected slot is no longer available.';
  END IF;

  -- 7. Find or create the client
  INSERT INTO clients (professional_id, full_name, phone)
  VALUES (p_professional_id, p_client_name, p_client_phone)
  ON CONFLICT (professional_id, phone) DO UPDATE 
    SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_client_id;

  -- 8. Insert the appointment
  INSERT INTO appointments (
    professional_id,
    service_id,
    client_id,
    scheduled_at,
    status
  )
  VALUES (
    p_professional_id,
    p_service_id,
    v_client_id,
    p_scheduled_at,
    'confirmed'
  )
  RETURNING id, professional_id, service_id, client_id, scheduled_at, status
  INTO v_appointment;

  RETURN row_to_json(v_appointment);
END;
$$ LANGUAGE plpgsql;
