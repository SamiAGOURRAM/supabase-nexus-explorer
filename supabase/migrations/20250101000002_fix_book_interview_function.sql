-- =====================================================
-- FIX: Ensure fn_book_interview function exists with correct signature
-- Migration: 20250101000002_fix_book_interview_function
-- =====================================================
-- This migration ensures the fn_book_interview function exists
-- with the correct signature: (p_student_id, p_slot_id, p_offer_id)
-- =====================================================

-- Drop any existing versions of the function with different signatures
DROP FUNCTION IF EXISTS public.fn_book_interview(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.fn_book_interview(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.fn_book_interview(UUID, TEXT) CASCADE;

-- Create the function with the correct signature
CREATE OR REPLACE FUNCTION public.fn_book_interview(
    p_student_id UUID,
    p_slot_id UUID,
    p_offer_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    booking_id UUID,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_slot_offer_id UUID;
    v_booking_phase INTEGER;
BEGIN
    -- Get event_id, company_id, and offer_id from slot
    SELECT event_id, company_id, offer_id INTO v_event_id, v_company_id, v_slot_offer_id
    FROM event_slots
    WHERE id = p_slot_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Slot not found'::TEXT;
        RETURN;
    END IF;

    -- Check if student already has a booking for this slot
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE student_id = p_student_id AND slot_id = p_slot_id AND status = 'confirmed'
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'You already have a booking for this time slot'::TEXT;
        RETURN;
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
    -- This also returns the current_phase which we'll use for the booking
    SELECT can_book, current_count, max_allowed, current_phase 
    INTO v_can_book, v_current_count, v_max_allowed, v_booking_phase
    FROM fn_check_student_booking_limit(p_student_id, v_event_id);

    IF NOT v_can_book THEN
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            format('You have reached your booking limit (%s/%s bookings)', v_current_count, v_max_allowed)::TEXT;
        RETURN;
    END IF;
    
    -- Ensure booking phase is valid (1 or 2)
    IF v_booking_phase NOT IN (1, 2) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Booking is not currently open. Please check the event phase.'::TEXT;
        RETURN;
    END IF;

    -- Verify offer exists and is active
    -- Also verify that the offer belongs to the company that owns this slot
    IF NOT EXISTS (
        SELECT 1 FROM offers o
        WHERE o.id = p_offer_id 
          AND o.is_active = true
          AND o.company_id = v_company_id
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Offer not found, inactive, or does not belong to this company'::TEXT;
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
    -- Note: bookings table does NOT have offer_id column
    -- The offer_id is stored in event_slots table
    INSERT INTO bookings (
        student_id,
        slot_id,
        status,
        booking_phase
    ) VALUES (
        p_student_id,
        p_slot_id,
        'confirmed',
        v_booking_phase
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
GRANT EXECUTE ON FUNCTION public.fn_book_interview(UUID, UUID, UUID) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION public.fn_book_interview IS 'Book interview slot for student with full validation (capacity, limits, conflicts, duplicates)';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Dropped all old versions of fn_book_interview
-- ✅ Created function with correct signature: (p_student_id, p_slot_id, p_offer_id)
-- ✅ Granted proper permissions
-- ✅ Function now matches frontend calls
-- =====================================================

