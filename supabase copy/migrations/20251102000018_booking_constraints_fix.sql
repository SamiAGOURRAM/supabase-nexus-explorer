-- Migration: Fix Booking Constraints
-- Created: 2025-11-02
-- Description: Add missing constraints (1 company per student, no time overlap)

-- Drop and recreate fn_book_interview with additional constraints
DROP FUNCTION IF EXISTS fn_book_interview(UUID, UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION fn_book_interview(
    p_student_id UUID,
    p_slot_id UUID,
    p_offer_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    booking_id UUID,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_slot_available BOOLEAN;
    v_can_book BOOLEAN;
    v_event_id UUID;
    v_company_id UUID;
    v_current_bookings INTEGER;
    v_max_allowed INTEGER;
    v_available_spots INTEGER;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
BEGIN
    -- Get event_id, company_id, and slot times from slot
    SELECT es.event_id, es.company_id, es.start_time, es.end_time
    INTO v_event_id, v_company_id, v_slot_start, v_slot_end
    FROM event_slots es
    WHERE es.id = p_slot_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Slot not found'::TEXT;
        RETURN;
    END IF;

    -- CONSTRAINT 1: Check if student already has a booking for this slot
    IF EXISTS (
        SELECT 1 FROM interview_bookings
        WHERE student_id = p_student_id AND slot_id = p_slot_id
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'You already have a booking for this time slot'::TEXT;
        RETURN;
    END IF;

    -- CONSTRAINT 2: One booking per company per student
    IF EXISTS (
        SELECT 1 
        FROM interview_bookings ib
        JOIN event_slots es ON es.id = ib.slot_id
        WHERE ib.student_id = p_student_id
          AND es.company_id = v_company_id
          AND ib.status = 'confirmed'
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 
            'You already have a booking with this company. Students can only book one interview per company.'::TEXT;
        RETURN;
    END IF;

    -- CONSTRAINT 3: No overlapping time slots (student cannot be in two places at once)
    IF EXISTS (
        SELECT 1 
        FROM interview_bookings ib
        JOIN event_slots es ON es.id = ib.slot_id
        WHERE ib.student_id = p_student_id
          AND ib.status = 'confirmed'
          AND (
              -- Check for time overlap
              (es.start_time < v_slot_end AND es.end_time > v_slot_start)
          )
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 
            'You already have a booking at this time. You cannot be in two places at once!'::TEXT;
        RETURN;
    END IF;

    -- Check slot availability
    SELECT is_available, available_spots INTO v_slot_available, v_available_spots
    FROM fn_check_slot_availability(p_slot_id);

    IF NOT v_slot_available THEN
        RETURN QUERY SELECT false, NULL::UUID, 'This slot is fully booked'::TEXT;
        RETURN;
    END IF;

    -- Check student booking limit for the event
    SELECT can_book, current_bookings, max_allowed INTO v_can_book, v_current_bookings, v_max_allowed
    FROM fn_check_student_booking_limit(p_student_id, v_event_id);

    IF NOT v_can_book THEN
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            format('You have reached your booking limit (%s/%s bookings)', v_current_bookings, v_max_allowed)::TEXT;
        RETURN;
    END IF;

    -- Verify offer exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM offers
        WHERE id = p_offer_id AND is_active = true
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Offer not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- All validations passed - create booking
    INSERT INTO interview_bookings (
        student_id,
        slot_id,
        offer_id,
        company_id,
        status
    ) VALUES (
        p_student_id,
        p_slot_id,
        p_offer_id,
        v_company_id,
        'confirmed'
    ) RETURNING id INTO v_booking_id;

    -- Return success
    RETURN QUERY SELECT 
        true, 
        v_booking_id, 
        format('Booking confirmed! (%s spots remaining in this slot)', v_available_spots - 1)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_book_interview(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION fn_book_interview IS 
    'Book an interview with full validation: capacity, phase limits, no duplicates, one per company, no time overlaps';


-- Fix fn_check_student_booking_limit to use current_phase from events table
DROP FUNCTION IF EXISTS fn_check_student_booking_limit(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION fn_check_student_booking_limit(
    p_student_id UUID,
    p_event_id UUID
)
RETURNS TABLE (
    can_book BOOLEAN,
    current_bookings INTEGER,
    max_allowed INTEGER,
    current_phase INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_phase INTEGER;
    v_max_bookings INTEGER;
    v_current_bookings INTEGER;
    v_phase1_limit INTEGER;
    v_phase2_limit INTEGER;
BEGIN
    -- Get event phase configuration
    SELECT 
        e.current_phase,
        e.phase1_booking_limit,
        e.phase2_booking_limit
    INTO 
        v_phase,
        v_phase1_limit,
        v_phase2_limit
    FROM events e
    WHERE e.id = p_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    -- Phase 0 = Closed, Phase 1 = Limited, Phase 2 = Open
    IF v_phase = 0 THEN
        v_max_bookings := 0; -- Booking closed
    ELSIF v_phase = 1 THEN
        v_max_bookings := v_phase1_limit; -- Phase 1 limit (typically 3)
    ELSE
        v_max_bookings := v_phase2_limit; -- Phase 2 limit (typically 6)
    END IF;

    -- Count student's confirmed bookings for this event
    SELECT COUNT(*) INTO v_current_bookings
    FROM interview_bookings ib
    JOIN event_slots es ON es.id = ib.slot_id
    WHERE ib.student_id = p_student_id
      AND ib.status = 'confirmed'
      AND es.event_id = p_event_id;

    -- Return result
    RETURN QUERY SELECT 
        (v_current_bookings < v_max_bookings) as can_book,
        v_current_bookings as current_bookings,
        v_max_bookings as max_allowed,
        v_phase as current_phase;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_check_student_booking_limit(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION fn_check_student_booking_limit IS 
    'Check if student can book more interviews based on event current_phase (0=closed, 1=phase1, 2=phase2)';

