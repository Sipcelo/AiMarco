-- Migration 20260324175700_smart_slots_availability --
-- 1. Adiciona opening_time e closing_time em professionals
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '18:00:00';

-- 2. Cria ou substitui a RPC get_available_slots_v1
CREATE OR REPLACE FUNCTION get_available_slots_v1(
    p_professional_id UUID,
    p_service_id UUID,
    p_date DATE
) RETURNS TABLE (
    available_time TEXT
) AS $$
DECLARE
    v_opening_time TIME;
    v_closing_time TIME;
    v_duration_minutes INT;
    v_day_start TIMESTAMPTZ;
    v_day_end TIMESTAMPTZ;
BEGIN
    -- Busca horarios do profissional
    SELECT opening_time, closing_time 
    INTO v_opening_time, v_closing_time 
    FROM professionals 
    WHERE id = p_professional_id;

    -- Se nao achar o profissional, retorna vazio
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Busca duracao do servico
    SELECT duration_minutes 
    INTO v_duration_minutes 
    FROM services 
    WHERE id = p_service_id;

    -- Se nao achar o servico, retorna vazio
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Define timezone como America/Sao_Paulo (ou padrao do banco)
    -- Asumindo UTC com offset no banco ou time zone configurado
    -- Usando timestamptz para bater com os ranges
    v_day_start := (p_date || ' ' || v_opening_time)::timestamptz;
    v_day_end   := (p_date || ' ' || v_closing_time)::timestamptz;

    RETURN QUERY
    WITH potential_slots AS (
        SELECT generate_series(
            v_day_start,
            v_day_end - (v_duration_minutes || ' minutes')::interval,
            '15 minutes'::interval
        ) AS slot_start
    ),
    busy_ranges AS (
        -- Blocked slots no dia
        SELECT time_range AS occupied_range
        FROM blocked_slots
        WHERE professional_id = p_professional_id
          AND time_range && tstzrange(v_day_start, v_day_end, '[)')

        UNION ALL

        -- Appointments Confirmados/Concluidos
        SELECT tstzrange(a.scheduled_start, a.scheduled_start + (s.duration_minutes || ' minutes')::interval, '[)') AS occupied_range
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.professional_id = p_professional_id
          AND a.status IN ('confirmed', 'completed')
          AND a.scheduled_start >= v_day_start - '1 day'::interval
          AND a.scheduled_start < v_day_end + '1 day'::interval
    )
    SELECT 
        to_char(ps.slot_start AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
    FROM potential_slots ps
    WHERE NOT EXISTS (
        SELECT 1 
        FROM busy_ranges br 
        WHERE br.occupied_range && tstzrange(ps.slot_start, ps.slot_start + (v_duration_minutes || ' minutes')::interval, '[)')
    )
    -- Exclui slots que já passaram, com margem de 30 minutos (Regra: minimum booking notice)
    AND ps.slot_start > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + '30 minutes'::interval)
    ORDER BY ps.slot_start;

END;
$$ LANGUAGE plpgsql;
