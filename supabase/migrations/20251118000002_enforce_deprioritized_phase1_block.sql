-- Migration: Enforce Phase 1 Blocking for Deprioritized Students
-- Created: 2025-11-18
-- Description: Students who marked "I already have an internship" cannot book in Phase 1

DROP FUNCTION IF EXISTS fn_check_student_booking_limit(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_check_student_booking_limit(
    p_student_id UUID,
    p_event_id UUID
)
RETURNS TABLE (
    can_book BOOLEAN,
    current_count INTEGER,
    max_allowed INTEGER,
    current_phase INTEGER,
    message TEXT
) AS $$
DECLARE
    v_current_phase INTEGER;
    v_max_allowed INTEGER;
    v_current_count INTEGER;
    v_phase_mode TEXT;
    v_is_deprioritized BOOLEAN;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Get student's deprioritization status
    SELECT is_deprioritized INTO v_is_deprioritized
    FROM profiles
    WHERE id = p_student_id;
    
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
    
    -- ⚠️ BLOCK DEPRIORITIZED STUDENTS IN PHASE 1
    IF v_current_phase = 1 AND v_is_deprioritized = true THEN
        RETURN QUERY SELECT 
            false,
            0,
            0,
            v_current_phase,
            '⚠️ You cannot book during Phase 1 because you indicated you already have an internship. You can book during Phase 2.'::TEXT;
        RETURN;
    END IF;
    
    -- Count student's existing confirmed bookings for this event (use bookings table)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fn_check_student_booking_limit(UUID, UUID) TO authenticated, anon;

COMMENT ON FUNCTION fn_check_student_booking_limit IS 
  'Checks if a student can book more interviews based on current phase and limits. 
   BLOCKS deprioritized students (those who already have internships) from booking in Phase 1.
   Uses bookings table. Supports both manual and date-based phase modes.';
