-- Migration: Booking Engine Functions
-- Created: 2025-11-01
-- Description: Backend logic for interview booking with capacity, phase limits, and validation

-- Drop existing functions if they exist (with CASCADE to handle all overloads)
DROP FUNCTION IF EXISTS fn_check_slot_availability CASCADE;
DROP FUNCTION IF EXISTS fn_check_student_booking_limit CASCADE;
DROP FUNCTION IF EXISTS fn_book_interview CASCADE;
DROP FUNCTION IF EXISTS fn_cancel_booking CASCADE;
DROP FUNCTION IF EXISTS fn_get_available_slots CASCADE;
DROP FUNCTION IF EXISTS fn_get_student_bookings CASCADE;

-- Function to check slot availability
CREATE OR REPLACE FUNCTION fn_check_slot_availability(
    p_slot_id UUID
)
RETURNS TABLE (
    is_available BOOLEAN,
    current_bookings INTEGER,
    max_capacity INTEGER,
    available_spots INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_capacity INTEGER;
    v_bookings INTEGER;
BEGIN
    -- Get slot capacity
    SELECT capacity INTO v_capacity
    FROM event_slots
    WHERE id = p_slot_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Slot not found or inactive';
    END IF;

    -- Count confirmed bookings for this slot
    SELECT COUNT(*) INTO v_bookings
    FROM interview_bookings
    WHERE slot_id = p_slot_id AND status = 'confirmed';

    -- Return availability info
    RETURN QUERY SELECT 
        (v_bookings < v_capacity) as is_available,
        v_bookings as current_bookings,
        v_capacity as max_capacity,
        (v_capacity - v_bookings) as available_spots;
END;
$$;

-- Function to check student booking limit
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
    v_phase INTEGER := 1; -- Default to phase 1
    v_max_bookings INTEGER := 3; -- Default phase 1 limit
    v_current_bookings INTEGER;
    v_event_date TIMESTAMPTZ;
BEGIN
    -- Get event date
    SELECT date INTO v_event_date
    FROM events
    WHERE id = p_event_id;

    -- Determine current phase based on date/time
    -- For now, simple logic: before event = phase 1, after event start = phase 2
    IF v_event_date <= NOW() THEN
        v_phase := 2;
        v_max_bookings := 6;
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

-- Main booking function with all validations
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
    v_current_bookings INTEGER;
    v_max_allowed INTEGER;
    v_available_spots INTEGER;
BEGIN
    -- Get event_id from slot
    SELECT event_id INTO v_event_id
    FROM event_slots
    WHERE id = p_slot_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Slot not found'::TEXT;
        RETURN;
    END IF;

    -- Check if student already has a booking for this slot
    IF EXISTS (
        SELECT 1 FROM interview_bookings
        WHERE student_id = p_student_id AND slot_id = p_slot_id
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'You already have a booking for this time slot'::TEXT;
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
        status
    ) VALUES (
        p_student_id,
        p_slot_id,
        p_offer_id,
        'confirmed'
    ) RETURNING id INTO v_booking_id;

    -- Return success
    RETURN QUERY SELECT 
        true, 
        v_booking_id, 
        format('Booking confirmed! (%s spots remaining in this slot)', v_available_spots - 1)::TEXT;
END;
$$;

-- Function to cancel a booking
CREATE OR REPLACE FUNCTION fn_cancel_booking(
    p_booking_id UUID,
    p_student_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_slot_time TIMESTAMPTZ;
BEGIN
    -- Get slot time to check if it's in the future
    SELECT es.slot_time INTO v_slot_time
    FROM interview_bookings ib
    JOIN event_slots es ON es.id = ib.slot_id
    WHERE ib.id = p_booking_id AND ib.student_id = p_student_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Booking not found or you are not authorized'::TEXT;
        RETURN;
    END IF;

    -- Check if slot is in the future (allow cancellation at least 24h before)
    IF v_slot_time < NOW() + INTERVAL '24 hours' THEN
        RETURN QUERY SELECT false, 'Cannot cancel bookings less than 24 hours before the interview'::TEXT;
        RETURN;
    END IF;

    -- Update booking status to cancelled
    UPDATE interview_bookings
    SET status = 'cancelled'
    WHERE id = p_booking_id AND student_id = p_student_id;

    RETURN QUERY SELECT true, 'Booking cancelled successfully'::TEXT;
END;
$$;

-- Function to get available slots for an offer
CREATE OR REPLACE FUNCTION fn_get_available_slots(
    p_offer_id UUID,
    p_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    slot_id UUID,
    slot_time TIMESTAMPTZ,
    capacity INTEGER,
    booked_count INTEGER,
    available_count INTEGER,
    event_name TEXT,
    event_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.id as slot_id,
        es.slot_time,
        es.capacity,
        COUNT(ib.id) FILTER (WHERE ib.status = 'confirmed')::INTEGER as booked_count,
        (es.capacity - COUNT(ib.id) FILTER (WHERE ib.status = 'confirmed'))::INTEGER as available_count,
        e.name as event_name,
        e.date as event_date
    FROM event_slots es
    JOIN events e ON e.id = es.event_id
    LEFT JOIN interview_bookings ib ON ib.slot_id = es.id
    WHERE es.is_active = true
      AND es.slot_time > NOW()
      AND (p_event_id IS NULL OR es.event_id = p_event_id)
      AND (es.capacity - COUNT(ib.id) FILTER (WHERE ib.status = 'confirmed')) > 0
    GROUP BY es.id, es.slot_time, es.capacity, e.name, e.date
    ORDER BY es.slot_time ASC;
END;
$$;

-- Function to get student's bookings
CREATE OR REPLACE FUNCTION fn_get_student_bookings(
    p_student_id UUID
)
RETURNS TABLE (
    booking_id UUID,
    slot_time TIMESTAMPTZ,
    offer_title TEXT,
    company_name TEXT,
    event_name TEXT,
    status TEXT,
    notes TEXT,
    can_cancel BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ib.id as booking_id,
        es.slot_time,
        o.title as offer_title,
        c.company_name,
        e.name as event_name,
        ib.status,
        ib.notes,
        (es.slot_time > NOW() + INTERVAL '24 hours' AND ib.status = 'confirmed') as can_cancel
    FROM interview_bookings ib
    JOIN event_slots es ON es.id = ib.slot_id
    JOIN offers o ON o.id = ib.offer_id
    JOIN companies c ON c.id = o.company_id
    JOIN events e ON e.id = es.event_id
    WHERE ib.student_id = p_student_id
    ORDER BY es.slot_time DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION fn_check_slot_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_check_student_booking_limit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_book_interview(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_cancel_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_available_slots(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_student_bookings(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION fn_check_slot_availability IS 'Check if a slot has available capacity';
COMMENT ON FUNCTION fn_check_student_booking_limit IS 'Check if student can book more interviews (phase 1: 3, phase 2: 6)';
COMMENT ON FUNCTION fn_book_interview IS 'Book an interview with full validation (capacity, limits, duplicates)';
COMMENT ON FUNCTION fn_cancel_booking IS 'Cancel a booking (must be >24h before interview)';
COMMENT ON FUNCTION fn_get_available_slots IS 'Get all available slots for an offer';
COMMENT ON FUNCTION fn_get_student_bookings IS 'Get all bookings for a student with cancellation eligibility';
