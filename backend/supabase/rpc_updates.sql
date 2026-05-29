-- create_appointment_v1: creates appointment with snapshot columns populated
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

-- Implementation of reschedule_appointment_v1 (Atomic Reschedule)
CREATE OR REPLACE FUNCTION reschedule_appointment_v1(
  p_old_appointment_id UUID,
  p_new_scheduled_at TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  v_old_appointment RECORD;
  v_new_appointment RECORD;
  v_duration_minutes INTEGER;
  v_new_ends_at TIMESTAMPTZ;
  v_local_scheduled_at TIMESTAMP;
  v_local_ends_at TIMESTAMP;
  v_day_of_week INTEGER;
  v_requested_time TIME;
  v_requested_end_time TIME;
  v_business_tz TEXT := 'America/Sao_Paulo';
BEGIN
  -- 1. Fetch old appointment
  SELECT * INTO v_old_appointment FROM appointments WHERE id = p_old_appointment_id AND status = 'confirmed';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Agendamento não encontrado ou não pode ser reagendado.');
  END IF;

  -- 2. Get service duration
  SELECT duration_minutes INTO v_duration_minutes FROM services WHERE id = v_old_appointment.service_id;

  -- 3. Compute new end time
  v_new_ends_at := p_new_scheduled_at + (v_duration_minutes || ' minutes')::interval;

  -- 4. Business rule validation (Availability)
  v_local_scheduled_at := p_new_scheduled_at AT TIME ZONE v_business_tz;
  v_local_ends_at := v_new_ends_at AT TIME ZONE v_business_tz;
  v_day_of_week := EXTRACT(DOW FROM v_local_scheduled_at);
  v_requested_time := v_local_scheduled_at::time;
  v_requested_end_time := v_local_ends_at::time;

  IF NOT EXISTS (
    SELECT 1 FROM availability_rules
    WHERE professional_id = v_old_appointment.professional_id
      AND day_of_week = v_day_of_week
      AND start_time <= v_requested_time
      AND end_time >= v_requested_end_time
      AND v_local_ends_at::date = v_local_scheduled_at::date
  ) THEN
    RETURN jsonb_build_object('error', 'Novo horário não disponível na agenda.');
  END IF;

  -- 5. Atomic Reschedule: Cancel old and Create new
  -- Note: We wrap everything in a transaction (RPCs are atomic)
  
  -- Cancel old
  UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = p_old_appointment_id;

  -- Insert new with lineage
  BEGIN
    INSERT INTO appointments (
      professional_id,
      service_id,
      client_id,
      scheduled_start,
      scheduled_end,
      status,
      rescheduled_from_appointment_id
    )
    VALUES (
      v_old_appointment.professional_id,
      v_old_appointment.service_id,
      v_old_appointment.client_id,
      p_new_scheduled_at,
      v_new_ends_at,
      'confirmed',
      p_old_appointment_id
    )
    RETURNING id, scheduled_start AS scheduled_at, status, rescheduled_from_appointment_id AS old_appointment_id
    INTO v_new_appointment;

    RETURN row_to_json(v_new_appointment);
  EXCEPTION WHEN exclusion_violation THEN
    RETURN jsonb_build_object('error', 'Horário indisponível (DB Constraint)');
  END;
END;
$$ LANGUAGE plpgsql;
