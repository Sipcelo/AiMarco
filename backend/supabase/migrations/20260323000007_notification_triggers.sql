-- Helper to create pending notifications for both client and professional
-- Updated to include pg_notify
CREATE OR REPLACE FUNCTION create_notification_v1(
  p_appointment_id UUID,
  p_template_key TEXT
)
RETURNS VOID AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  -- Notify Professional
  INSERT INTO notifications (appointment_id, recipient_type, channel, template_key, status)
  VALUES (p_appointment_id, 'professional', 'in_app', p_template_key, 'pending')
  RETURNING id INTO v_notif_id;
  
  PERFORM pg_notify('new_notification', v_notif_id::text);

  -- Notify Client
  INSERT INTO notifications (appointment_id, recipient_type, channel, template_key, status)
  VALUES (p_appointment_id, 'client', 'whatsapp', p_template_key, 'pending')
  RETURNING id INTO v_notif_id;

  PERFORM pg_notify('new_notification', v_notif_id::text);
END;
$$ LANGUAGE plpgsql;

-- Trigger for APPOINTMENT_CREATED
CREATE OR REPLACE FUNCTION trigger_appointment_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    PERFORM create_notification_v1(NEW.id, 'APPOINTMENT_CREATED');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_appointment_created
AFTER INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_appointment_created();

-- Trigger for APPOINTMENT_CANCELLED
CREATE OR REPLACE FUNCTION trigger_appointment_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    PERFORM create_notification_v1(NEW.id, 'APPOINTMENT_CANCELLED');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_appointment_cancelled
AFTER UPDATE ON appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trigger_appointment_cancelled();

-- Consolidated trigger
CREATE OR REPLACE FUNCTION trigger_appointment_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Creation
  IF (TG_OP = 'INSERT') THEN
    IF NEW.rescheduled_from_appointment_id IS NOT NULL THEN
      PERFORM create_notification_v1(NEW.id, 'APPOINTMENT_RESCHEDULED');
    ELSE
      PERFORM create_notification_v1(NEW.id, 'APPOINTMENT_CREATED');
    END IF;
  -- Cancellation
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      PERFORM create_notification_v1(NEW.id, 'APPOINTMENT_CANCELLED');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up and replace with consolidated trigger
DROP TRIGGER IF EXISTS on_appointment_created ON appointments;
DROP TRIGGER IF EXISTS on_appointment_cancelled ON appointments;
DROP TRIGGER IF EXISTS on_appointment_event ON appointments;

CREATE TRIGGER on_appointment_event
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_appointment_notifications();
