CREATE OR REPLACE FUNCTION cancel_appointment_v1(
  p_appointment_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_updated_appointment RECORD;
BEGIN
  -- 1. Find the appointment and check its current status
  -- We perform the update directly with a condition to ensure atomicity
  UPDATE appointments
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_appointment_id
    AND status = 'confirmed'
  RETURNING id, status INTO v_updated_appointment;

  -- 2. Handle cases where the update didn't happen
  IF NOT FOUND THEN
    -- Check if it's because it doesn't exist or because status is not confirmed
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE id = p_appointment_id) THEN
      RAISE EXCEPTION 'Appointment not found.';
    ELSE
      RAISE EXCEPTION 'Appointment cannot be cancelled.';
    END IF;
  END IF;

  -- 3. Return the updated appointment
  RETURN row_to_json(v_updated_appointment);
END;
$$ LANGUAGE plpgsql;
