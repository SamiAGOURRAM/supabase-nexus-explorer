-- Update fn_cancel_booking to use bookings table instead of interview_bookings
CREATE OR REPLACE FUNCTION public.fn_cancel_booking(p_booking_id uuid, p_student_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
BEGIN
    -- Get slot start time to check if it's in the future
    SELECT es.start_time INTO v_start_time
    FROM bookings b
    JOIN event_slots es ON es.id = b.slot_id
    WHERE b.id = p_booking_id AND b.student_id = p_student_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Booking not found or you are not authorized'::TEXT;
        RETURN;
    END IF;

    -- Check if slot is in the future (allow cancellation at least 24h before)
    IF v_start_time < NOW() + INTERVAL '24 hours' THEN
        RETURN QUERY SELECT false, 'Cannot cancel bookings less than 24 hours before the interview'::TEXT;
        RETURN;
    END IF;

    -- Update booking status to cancelled
    UPDATE bookings
    SET status = 'cancelled'
    WHERE id = p_booking_id AND student_id = p_student_id;

    RETURN QUERY SELECT true, 'Booking cancelled successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_cancel_booking(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION fn_cancel_booking IS 'Cancel student booking - Updated to use bookings table';