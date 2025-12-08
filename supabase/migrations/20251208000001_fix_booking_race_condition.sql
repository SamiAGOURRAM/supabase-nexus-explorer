-- Fix race condition in booking function by adding row-level locks
-- This ensures that when multiple students try to book the same slot simultaneously,
-- they see accurate availability counts

CREATE OR REPLACE FUNCTION public.fn_book_interview(p_student_id uuid, p_slot_id uuid, p_offer_id uuid)
RETURNS TABLE(success boolean, booking_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_slot_available BOOLEAN;
    v_can_book BOOLEAN;
    v_event_id UUID;
    v_current_count INTEGER;
    v_max_allowed INTEGER;
    v_available_spots INTEGER;
    v_company_id UUID;
    v_slot_capacity INTEGER;
    v_current_bookings INTEGER;
    v_current_phase INTEGER;
BEGIN
    -- CRITICAL FIX: Lock the slot row to prevent race conditions
    -- This ensures that when Student1 is booking, Student2 has to wait
    -- and will see the updated booking count
    SELECT event_id, company_id, capacity INTO v_event_id, v_company_id, v_slot_capacity
    FROM event_slots
    WHERE id = p_slot_id
    FOR UPDATE; -- ROW-LEVEL LOCK: This is the key fix!

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Slot not found'::TEXT;
        RETURN;
    END IF;

    -- Get current phase from event
    SELECT current_phase INTO v_current_phase
    FROM events
    WHERE id = v_event_id;

    -- Default to phase 1 if not found
    IF v_current_phase IS NULL THEN
        v_current_phase := 1;
    END IF;

    -- Count current confirmed bookings WITHOUT lock (can't use FOR UPDATE with COUNT)
    SELECT COUNT(*) INTO v_current_bookings
    FROM bookings
    WHERE slot_id = p_slot_id AND status = 'confirmed';

    -- Check if slot is full
    IF v_current_bookings >= v_slot_capacity THEN
        RETURN QUERY SELECT false, NULL::UUID, 
            format('This slot is fully booked (%s/%s spots taken)', v_current_bookings, v_slot_capacity)::TEXT;
        RETURN;
    END IF;

    -- Check if student already has a booking for this slot (including cancelled ones due to unique constraint)
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE student_id = p_student_id AND slot_id = p_slot_id
    ) THEN
        -- Check if it's a cancelled booking - if so, delete it to allow rebooking
        DELETE FROM bookings
        WHERE student_id = p_student_id 
          AND slot_id = p_slot_id 
          AND status = 'cancelled';
        
        -- If there's still a booking (meaning it was confirmed), return error
        IF EXISTS (
            SELECT 1 FROM bookings
            WHERE student_id = p_student_id AND slot_id = p_slot_id
        ) THEN
            RETURN QUERY SELECT false, NULL::UUID, 'You already have a booking for this time slot'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Check if student already has a booking with this company for this event
    IF EXISTS (
        SELECT 1 
        FROM bookings b
        JOIN event_slots es ON es.id = b.slot_id
        WHERE b.student_id = p_student_id 
          AND es.company_id = v_company_id
          AND es.event_id = v_event_id
          AND b.status = 'confirmed'
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'You already have a booking with this company for this event'::TEXT;
        RETURN;
    END IF;

    -- Check student booking limit for the event
    SELECT can_book, current_count, max_allowed 
    INTO v_can_book, v_current_count, v_max_allowed
    FROM fn_check_student_booking_limit(p_student_id, v_event_id);

    IF NOT v_can_book THEN
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            format('You have reached your booking limit (%s/%s bookings)', v_current_count, v_max_allowed)::TEXT;
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

    -- Check for time conflicts with existing bookings
    IF EXISTS (
        SELECT 1
        FROM bookings b
        JOIN event_slots es_existing ON es_existing.id = b.slot_id
        JOIN event_slots es_new ON es_new.id = p_slot_id
        WHERE b.student_id = p_student_id
          AND b.status = 'confirmed'
          AND es_existing.start_time < es_new.end_time
          AND es_existing.end_time > es_new.start_time
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'This time slot conflicts with another booking'::TEXT;
        RETURN;
    END IF;

    -- All validations passed - create booking
    INSERT INTO bookings (
        student_id,
        slot_id,
        offer_id,
        status,
        booking_phase
    ) VALUES (
        p_student_id,
        p_slot_id,
        p_offer_id,
        'confirmed',
        v_current_phase
    ) RETURNING id INTO v_booking_id;

    -- Calculate remaining spots after booking
    v_available_spots := v_slot_capacity - v_current_bookings - 1;

    -- Return success with detailed message
    RETURN QUERY SELECT 
        true, 
        v_booking_id, 
        format('Interview booked successfully! %s spot(s) remaining', v_available_spots)::TEXT;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.fn_book_interview IS 
'Book interview slot with row-level locking to prevent race conditions. 
Updated 2025-12-08 to fix issue where multiple students see incorrect availability counts.';

-- Verify permissions
GRANT EXECUTE ON FUNCTION public.fn_book_interview(UUID, UUID, UUID) TO authenticated;
