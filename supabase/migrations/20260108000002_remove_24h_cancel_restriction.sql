-- Remove 24-hour cancellation restriction
-- Allow students to cancel bookings at any time

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

    -- Removed 24-hour restriction - allow cancellation at any time

    -- Update booking status to cancelled
    UPDATE bookings
    SET 
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE id = p_booking_id AND student_id = p_student_id;

    RETURN QUERY SELECT true, 'Booking cancelled successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION fn_cancel_booking(UUID, UUID) IS 
    'Cancels a student booking at any time (no time restriction).';
