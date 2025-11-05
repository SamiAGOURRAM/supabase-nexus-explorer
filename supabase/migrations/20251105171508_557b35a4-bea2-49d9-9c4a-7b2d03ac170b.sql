-- Update fn_check_student_booking_limit to query bookings table instead of interview_bookings
CREATE OR REPLACE FUNCTION fn_check_student_booking_limit(p_student_id uuid, p_event_id uuid)
RETURNS TABLE(can_book boolean, current_count integer, max_allowed integer, current_phase integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_phase INTEGER;
    v_max_allowed INTEGER;
    v_current_count INTEGER;
    v_phase_mode TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Get event phase configuration
    SELECT 
        e.phase_mode,
        CASE 
            WHEN e.phase_mode = 'date-based' THEN
                -- Auto-determine phase based on dates
                CASE 
                    WHEN v_now < e.phase1_start_date THEN 0
                    WHEN v_now >= e.phase1_start_date AND v_now <= e.phase1_end_date THEN 1
                    WHEN v_now >= e.phase2_start_date AND v_now <= e.phase2_end_date THEN 2
                    ELSE 0  -- Outside all date ranges = closed
                END
            ELSE
                -- Use manual phase
                e.current_phase
        END,
        CASE 
            WHEN e.phase_mode = 'date-based' THEN
                CASE 
                    WHEN v_now >= e.phase1_start_date AND v_now <= e.phase1_end_date THEN e.phase1_max_bookings
                    WHEN v_now >= e.phase2_start_date AND v_now <= e.phase2_end_date THEN e.phase2_max_bookings
                    ELSE 0
                END
            ELSE
                CASE 
                    WHEN e.current_phase = 1 THEN e.phase1_max_bookings
                    WHEN e.current_phase = 2 THEN e.phase2_max_bookings
                    ELSE 0
                END
        END
    INTO v_phase_mode, v_current_phase, v_max_allowed
    FROM events e
    WHERE e.id = p_event_id;
    
    -- Phase 0 = bookings closed
    IF v_current_phase = 0 THEN
        RETURN QUERY SELECT 
            false,
            0,
            0,
            v_current_phase,
            'Bookings are currently closed for this event'::TEXT;
        RETURN;
    END IF;
    
    -- Count student's existing confirmed bookings for this event (UPDATED TO USE bookings table)
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings b
    JOIN event_slots es ON es.id = b.slot_id
    WHERE b.student_id = p_student_id
      AND es.event_id = p_event_id
      AND b.status = 'confirmed';
    
    -- Return result
    RETURN QUERY SELECT 
        (v_current_count < v_max_allowed),
        v_current_count,
        v_max_allowed,
        v_current_phase,
        CASE 
            WHEN v_current_count >= v_max_allowed THEN 
                format('You have reached the maximum of %s interviews for Phase %s', 
                       v_max_allowed, v_current_phase)
            ELSE 
                format('You can book %s more interview(s). Phase %s: %s/%s booked', 
                       v_max_allowed - v_current_count, 
                       v_current_phase, 
                       v_current_count, 
                       v_max_allowed)
        END::TEXT;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION fn_check_student_booking_limit(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION fn_check_student_booking_limit IS 'Check if student can book more interviews based on event phase limits - Updated to use bookings table';