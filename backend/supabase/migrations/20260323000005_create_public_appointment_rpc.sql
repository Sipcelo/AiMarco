-- RPC para criação atômica de clientes e agendamento (Fase 3.3)
CREATE OR REPLACE FUNCTION create_public_appointment_v1(
  p_professional_id UUID,
  p_service_id UUID,
  p_scheduled_start TIMESTAMPTZ,
  p_client_name TEXT,
  p_client_phone TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_duration_minutes INTEGER;
  v_price_cents INTEGER;
  v_service_name TEXT;
  v_scheduled_end TIMESTAMPTZ;
  v_appointment_id UUID;
BEGIN
  -- 1. Buscar dados do serviço
  SELECT duration_minutes, price_cents, name
  INTO v_duration_minutes, v_price_cents, v_service_name
  FROM services
  WHERE id = p_service_id AND professional_id = p_professional_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found or is inactive';
  END IF;

  -- 2. Calcular o fim do agendamento
  v_scheduled_end := p_scheduled_start + (v_duration_minutes || ' minutes')::interval;

  -- 3. UPSERT do Cliente (Baseado na unique constraint constraint clients_professional_phone_key)
  INSERT INTO clients (professional_id, full_name, phone)
  VALUES (p_professional_id, p_client_name, p_client_phone)
  ON CONFLICT (professional_id, phone) 
  DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
  RETURNING id INTO v_client_id;

  -- 4. INSERT do Agendamento (se houver conflito, a GiST constraint "appointments_overlap_exclude" causará erro 23P01 abortando a transação)
  INSERT INTO appointments (
    professional_id,
    client_id,
    service_id,
    status,
    scheduled_start,
    scheduled_end,
    client_name_snapshot,
    client_phone_snapshot,
    service_name_snapshot,
    service_duration_snapshot_minutes,
    price_snapshot_cents
  ) VALUES (
    p_professional_id,
    v_client_id,
    p_service_id,
    'confirmed',
    p_scheduled_start,
    v_scheduled_end,
    p_client_name,
    p_client_phone,
    v_service_name,
    v_duration_minutes,
    v_price_cents
  ) RETURNING id INTO v_appointment_id;

  -- Retorna os dados resumidos do agendamento criado
  RETURN json_build_object(
    'id', v_appointment_id,
    'client_id', v_client_id,
    'scheduled_start', p_scheduled_start,
    'scheduled_end', v_scheduled_end,
    'status', 'confirmed'
  )::jsonb;
END;
$$;
