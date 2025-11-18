-- Migration: Fix Cancel Booking Function
-- Created: 2025-11-18
-- Problem: fn_cancel_booking uses wrong table name (interview_bookings instead of bookings) and wrong column (slot_time instead of start_time)
-- Solution: Update function to use correct table and column names

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
    v_status TEXT;
BEGIN
    -- Get slot time and current booking status
    -- Use COALESCE to check both slot_time (new) and start_time (old) columns for compatibility
    SELECT COALESCE(es.slot_time, es.start_time), b.status 
    INTO v_slot_time, v_status
    FROM bookings b
    JOIN event_slots es ON es.id = b.slot_id
    WHERE b.id = p_booking_id AND b.student_id = p_student_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Booking not found or you are not authorized'::TEXT;
        RETURN;
    END IF;

    -- Check if already cancelled
    IF v_status = 'cancelled' THEN
        RETURN QUERY SELECT false, 'Booking is already cancelled'::TEXT;
        RETURN;
    END IF;

    -- Check if slot is in the future (allow cancellation at least 24h before)
    IF v_slot_time < NOW() + INTERVAL '24 hours' THEN
        RETURN QUERY SELECT false, 'Cannot cancel bookings less than 24 hours before the interview'::TEXT;
        RETURN;
    END IF;

    -- Update booking status to cancelled
    -- Must also set cancelled_at to satisfy cancel_fields_consistent constraint
    UPDATE bookings
    SET 
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE id = p_booking_id AND student_id = p_student_id;

    RETURN QUERY SELECT true, 'Booking cancelled successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION fn_cancel_booking(UUID, UUID) IS 
    'Cancels a student booking if it is more than 24 hours in the future. Works with both slot_time and start_time columns for compatibility.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fn_cancel_booking(UUID, UUID) TO authenticated;
