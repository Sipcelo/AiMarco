-- Migration: promove e corrige reschedule_appointment_v1.
--
-- Antes só existia em backend/supabase/rpc_updates.sql (arquivo avulso, pendência #3) — mesma
-- situação do cancel_appointment_v1, que estava AUSENTE no Supabase de produção (2026-06-01).
--
-- Correção adicional: o INSERT do novo agendamento agora popula os snapshots
-- (service_name, service_duration_minutes, client_name, client_phone), carregados do
-- agendamento antigo. Sem isso, o agendamento reagendado aparecia sem serviço/cliente.

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
  -- 1. Fetch old appointment (must be confirmed)
  SELECT * INTO v_old_appointment
  FROM appointments
  WHERE id = p_old_appointment_id AND status = 'confirmed';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Agendamento não encontrado ou não pode ser reagendado.');
  END IF;

  -- 2. Service duration
  SELECT duration_minutes INTO v_duration_minutes
  FROM services WHERE id = v_old_appointment.service_id;

  -- 3. New end time
  v_new_ends_at := p_new_scheduled_at + (v_duration_minutes || ' minutes')::interval;

  -- 4. Availability validation (business timezone)
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

  -- 5. Atomic reschedule: cancel old, insert new (snapshots carried over)
  UPDATE appointments SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_old_appointment_id;

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
      client_phone,
      rescheduled_from_appointment_id
    )
    VALUES (
      v_old_appointment.professional_id,
      v_old_appointment.service_id,
      v_old_appointment.client_id,
      p_new_scheduled_at,
      v_new_ends_at,
      'confirmed',
      v_old_appointment.service_name,
      COALESCE(v_old_appointment.service_duration_minutes, v_duration_minutes),
      v_old_appointment.client_name,
      v_old_appointment.client_phone,
      p_old_appointment_id
    )
    RETURNING id, professional_id, service_id, client_id,
              scheduled_start AS scheduled_at, status,
              service_name, service_duration_minutes,
              client_name, client_phone,
              rescheduled_from_appointment_id AS old_appointment_id
    INTO v_new_appointment;

    RETURN row_to_json(v_new_appointment);
  EXCEPTION WHEN exclusion_violation THEN
    RETURN jsonb_build_object('error', 'Horário indisponível (DB Constraint)');
  END;
END;
$$ LANGUAGE plpgsql;
