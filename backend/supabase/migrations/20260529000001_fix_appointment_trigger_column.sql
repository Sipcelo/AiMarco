-- Fix 1: Trigger function referencing renamed column `scheduled_at` → `scheduled_start`
-- (column was renamed in 20260323000006_exclusion_constraints.sql)

CREATE OR REPLACE FUNCTION check_appointment_block_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'appointments' THEN
        IF NEW.status = 'confirmed' AND EXISTS (
            SELECT 1 FROM blocked_slots
            WHERE professional_id = NEW.professional_id
            AND time_range && tstzrange(
                NEW.scheduled_start,
                NEW.scheduled_start + interval '1 minute' * (SELECT duration_minutes FROM services WHERE id = NEW.service_id),
                '[)'
            )
        ) THEN
            RAISE EXCEPTION 'overlap_with_block' USING ERRCODE = '23P04';
        END IF;

    ELSIF TG_TABLE_NAME = 'blocked_slots' THEN
        IF EXISTS (
            SELECT 1 FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.professional_id = NEW.professional_id
            AND a.status = 'confirmed'
            AND tstzrange(a.scheduled_start, a.scheduled_start + interval '1 minute' * s.duration_minutes, '[)') && NEW.time_range
        ) THEN
            RAISE EXCEPTION 'overlap_with_appointment' USING ERRCODE = '23P04';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Update create_appointment_v1 to populate snapshot columns
-- (columns added in 20260325000001_add_snapshots_to_appointments.sql)

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
  v_service_name TEXT;
  v_ends_at TIMESTAMPTZ;
  v_client_id UUID;
  v_appointment RECORD;
  v_local_scheduled_at TIMESTAMP;
  v_local_ends_at TIMESTAMP;
  v_day_of_week INTEGER;
  v_requested_time TIME;
  v_requested_end_time TIME;
  v_business_tz TEXT := 'America/Sao_Paulo';
BEGIN
  -- 1. Validate service and get duration + name
  SELECT duration_minutes, name INTO v_duration_minutes, v_service_name
  FROM services
  WHERE id = p_service_id
    AND professional_id = p_professional_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Service not found or does not belong to the professional.');
  END IF;

  -- 2. Compute absolute and local timestamps
  v_ends_at := p_scheduled_at + (v_duration_minutes || ' minutes')::interval;
  v_local_scheduled_at := p_scheduled_at AT TIME ZONE v_business_tz;
  v_local_ends_at := v_ends_at AT TIME ZONE v_business_tz;
  v_day_of_week := EXTRACT(DOW FROM v_local_scheduled_at);
  v_requested_time := v_local_scheduled_at::time;
  v_requested_end_time := v_local_ends_at::time;

  -- 3. Verify the full window fits a valid availability_rule
  IF NOT EXISTS (
    SELECT 1 FROM availability_rules
    WHERE professional_id = p_professional_id
      AND day_of_week = v_day_of_week
      AND start_time <= v_requested_time
      AND end_time >= v_requested_end_time
      AND v_local_ends_at::date = v_local_scheduled_at::date
  ) THEN
    RETURN jsonb_build_object('error', 'Selected slot is no longer available.');
  END IF;

  -- 4. Find or create the client
  INSERT INTO clients (professional_id, full_name, phone)
  VALUES (p_professional_id, p_client_name, p_client_phone)
  ON CONFLICT (professional_id, phone) DO UPDATE
    SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_client_id;

  -- 5. Insert the appointment with snapshots
  BEGIN
    INSERT INTO appointments (
      professional_id,
      service_id,
      client_id,
      scheduled_start,
      scheduled_end,
      status,
      service_name,
      service_duration_minutes,
      client_name,
      client_phone
    )
    VALUES (
      p_professional_id,
      p_service_id,
      v_client_id,
      p_scheduled_at,
      v_ends_at,
      'confirmed',
      v_service_name,
      v_duration_minutes,
      p_client_name,
      p_client_phone
    )
    RETURNING id, professional_id, service_id, client_id,
              scheduled_start AS scheduled_at, status,
              service_name, service_duration_minutes,
              client_name, client_phone
    INTO v_appointment;

    RETURN row_to_json(v_appointment);
  EXCEPTION WHEN exclusion_violation THEN
    RETURN jsonb_build_object('error', 'Horário indisponível (DB Constraint)');
  END;
END;
$$ LANGUAGE plpgsql;
