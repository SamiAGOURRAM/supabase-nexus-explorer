-- Migration: Fix slot generation to create slots per company
-- Created: 2025-11-02
-- Description: Generate one slot per verified company for each time range

-- NUCLEAR OPTION: Drop ALL functions with this name regardless of signature
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure as func_signature
        FROM pg_proc 
        WHERE proname = 'fn_generate_event_slots'
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.func_signature || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION fn_generate_event_slots(p_event_id UUID)
RETURNS TABLE (
    slots_created INTEGER,
    time_ranges_processed INTEGER,
    companies_processed INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_time_range RECORD;
    v_company RECORD;
    v_current_slot_time TIMESTAMPTZ;
    v_end_datetime TIMESTAMPTZ;
    v_slot_interval INTERVAL;
    v_slots_count INTEGER := 0;
    v_ranges_count INTEGER := 0;
    v_companies_count INTEGER := 0;
BEGIN
    -- Get event details
    SELECT interview_duration_minutes, buffer_minutes, slots_per_time
    INTO v_event
    FROM events
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    -- Calculate total interval (interview + buffer)
    v_slot_interval := (v_event.interview_duration_minutes + v_event.buffer_minutes) * INTERVAL '1 minute';

    -- Delete existing slots for this event
    DELETE FROM event_slots WHERE event_id = p_event_id;

    -- Count verified companies with active offers
    SELECT COUNT(DISTINCT c.id) INTO v_companies_count
    FROM companies c
    INNER JOIN offers o ON o.company_id = c.id
    WHERE c.verification_status = 'verified' AND o.is_active = true;

    -- Loop through all time ranges for this event
    FOR v_time_range IN
        SELECT day_date, start_time, end_time
        FROM event_time_ranges
        WHERE event_id = p_event_id
        ORDER BY day_date, start_time
    LOOP
        v_ranges_count := v_ranges_count + 1;
        
        -- Combine date and start time
        v_current_slot_time := v_time_range.day_date + v_time_range.start_time;
        v_end_datetime := v_time_range.day_date + v_time_range.end_time;

        -- Generate slots for this time range
        WHILE v_current_slot_time + (v_event.interview_duration_minutes * INTERVAL '1 minute') <= v_end_datetime LOOP
            
            -- Create ONE slot per verified company with active offers
            FOR v_company IN
                SELECT DISTINCT c.id as company_id
                FROM companies c
                INNER JOIN offers o ON o.company_id = c.id
                WHERE c.verification_status = 'verified' 
                  AND o.is_active = true
            LOOP
                -- Insert slot for this company at this time
                INSERT INTO event_slots (
                    event_id, 
                    company_id, 
                    slot_time, 
                    start_time,
                    end_time,
                    capacity
                )
                VALUES (
                    p_event_id, 
                    v_company.company_id,
                    v_current_slot_time,
                    v_current_slot_time,
                    v_current_slot_time + (v_event.interview_duration_minutes * INTERVAL '1 minute'),
                    v_event.slots_per_time
                );
                
                v_slots_count := v_slots_count + 1;
            END LOOP;
            
            v_current_slot_time := v_current_slot_time + v_slot_interval;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT v_slots_count, v_ranges_count, v_companies_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION fn_generate_event_slots(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION fn_generate_event_slots IS 'Generate interview slots: one slot per verified company for each time range. Students book by selecting company + offer.';
