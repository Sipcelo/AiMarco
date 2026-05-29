-- Migration: rewrite get_available_slots_v1
--
-- Changes:
-- 1. Use availability_rules table instead of professionals.opening_time/closing_time
--    This enables multiple time windows per day (e.g. 08:00-11:00 + 14:00-18:00)
-- 2. Add 30-minute buffer after each confirmed appointment in busy_ranges
--    so the next bookable slot is 30 min after the previous service ends
-- 3. Change slot granularity from 15 to 30 minutes (standard for salons)

CREATE OR REPLACE FUNCTION get_available_slots_v1(
    p_professional_id UUID,
    p_service_id      UUID,
    p_date            DATE
) RETURNS TABLE (available_time TEXT) AS $$
DECLARE
    v_duration_minutes INT;
    v_day_of_week      INT;
    v_business_tz      TEXT := 'America/Sao_Paulo';
    v_buffer_minutes   INT  := 30;
    v_slot_interval    TEXT := '30 minutes';
    rule               RECORD;
    v_window_start     TIMESTAMPTZ;
    v_window_end       TIMESTAMPTZ;
BEGIN
    -- 1. Get service duration
    SELECT duration_minutes INTO v_duration_minutes
    FROM services
    WHERE id = p_service_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Verify professional exists
    IF NOT EXISTS (SELECT 1 FROM professionals WHERE id = p_professional_id) THEN
        RETURN;
    END IF;

    -- 3. Day of week in local timezone (0=Sun, 1=Mon, ..., 6=Sat)
    v_day_of_week := EXTRACT(DOW FROM (p_date::TEXT || 'T12:00:00')::TIMESTAMP AT TIME ZONE v_business_tz);

    -- 4. Pre-compute busy ranges for the day (appointments + blocked slots)
    --    Appointments: range = [scheduled_start, scheduled_end + buffer)
    --    Blocked slots: range = time_range
    CREATE TEMP TABLE IF NOT EXISTS _busy_ranges_tmp (occupied TSTZRANGE) ON COMMIT DROP;
    TRUNCATE _busy_ranges_tmp;

    INSERT INTO _busy_ranges_tmp
    SELECT tstzrange(
        a.scheduled_start,
        a.scheduled_end + (v_buffer_minutes || ' minutes')::INTERVAL,
        '[)'
    )
    FROM appointments a
    WHERE a.professional_id = p_professional_id
      AND a.status IN ('confirmed', 'completed')
      AND a.scheduled_start >= (p_date::TEXT || 'T00:00:00')::TIMESTAMP AT TIME ZONE v_business_tz - INTERVAL '1 day'
      AND a.scheduled_start <  (p_date::TEXT || 'T00:00:00')::TIMESTAMP AT TIME ZONE v_business_tz + INTERVAL '2 days';

    INSERT INTO _busy_ranges_tmp
    SELECT bs.time_range
    FROM blocked_slots bs
    WHERE bs.professional_id = p_professional_id
      AND bs.time_range && tstzrange(
          (p_date::TEXT || 'T00:00:00')::TIMESTAMP AT TIME ZONE v_business_tz,
          (p_date::TEXT || 'T00:00:00')::TIMESTAMP AT TIME ZONE v_business_tz + INTERVAL '1 day',
          '[)'
      );

    -- 5. For each availability_rule window on this day, generate slots
    FOR rule IN
        SELECT start_time, end_time
        FROM availability_rules
        WHERE professional_id = p_professional_id
          AND day_of_week = v_day_of_week
        ORDER BY start_time
    LOOP
        -- Convert local wall-clock rule times to absolute timestamps for p_date
        v_window_start := (p_date::TEXT || ' ' || rule.start_time::TEXT)::TIMESTAMP AT TIME ZONE v_business_tz;
        v_window_end   := (p_date::TEXT || ' ' || rule.end_time::TEXT)::TIMESTAMP AT TIME ZONE v_business_tz;

        RETURN QUERY
        SELECT to_char(slot_start AT TIME ZONE v_business_tz, 'HH24:MI')
        FROM (
            SELECT generate_series(
                v_window_start,
                v_window_end - (v_duration_minutes || ' minutes')::INTERVAL,
                v_slot_interval::INTERVAL
            ) AS slot_start
        ) slots
        WHERE
            -- Slot not in the past (minimum 30-min booking notice)
            slot_start > (CURRENT_TIMESTAMP + INTERVAL '30 minutes')
            -- Slot does not overlap with any busy range
            AND NOT EXISTS (
                SELECT 1 FROM _busy_ranges_tmp br
                WHERE br.occupied && tstzrange(
                    slot_start,
                    slot_start + (v_duration_minutes || ' minutes')::INTERVAL,
                    '[)'
                )
            )
        ORDER BY slot_start;
    END LOOP;

END;
$$ LANGUAGE plpgsql;
