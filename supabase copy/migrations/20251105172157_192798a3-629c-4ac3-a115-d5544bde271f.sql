-- Update fn_book_interview to use bookings table instead of interview_bookings
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
BEGIN
    -- Get event_id and company_id from slot
    SELECT event_id, company_id INTO v_event_id, v_company_id
    FROM event_slots
    WHERE id = p_slot_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Slot not found'::TEXT;
        RETURN;
    END IF;

    -- Check if student already has a booking for this slot (UPDATED to use bookings table)
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE student_id = p_student_id AND slot_id = p_slot_id AND status = 'confirmed'
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'You already have a booking for this time slot'::TEXT;
        RETURN;
    END IF;

    -- Check if student already has a booking with this company for this event (UPDATED to use bookings table)
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

    -- Check slot availability
    SELECT COUNT(*) INTO v_available_spots
    FROM event_slots es
    WHERE es.id = p_slot_id
      AND es.capacity > (
        SELECT COUNT(*) FROM bookings WHERE slot_id = p_slot_id AND status = 'confirmed'
      );

    IF v_available_spots = 0 THEN
        RETURN QUERY SELECT false, NULL::UUID, 'This slot is fully booked'::TEXT;
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

    -- Check for time conflicts with existing bookings (UPDATED to use bookings table)
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

    -- All validations passed - create booking (UPDATED to use bookings table)
    INSERT INTO bookings (
        student_id,
        slot_id,
        offer_id,
        status
    ) VALUES (
        p_student_id,
        p_slot_id,
        p_offer_id,
        'confirmed'
    ) RETURNING id INTO v_booking_id;

    -- Calculate remaining spots
    SELECT es.capacity - COUNT(b.id)
    INTO v_available_spots
    FROM event_slots es
    LEFT JOIN bookings b ON b.slot_id = es.id AND b.status = 'confirmed'
    WHERE es.id = p_slot_id
    GROUP BY es.capacity;

    -- Return success
    RETURN QUERY SELECT 
        true, 
        v_booking_id, 
        format('Booking confirmed! (%s spots remaining in this slot)', COALESCE(v_available_spots, 0))::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fn_book_interview(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION fn_book_interview IS 'Book interview slot for student - Updated to use bookings table';