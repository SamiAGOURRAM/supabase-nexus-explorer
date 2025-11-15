-- Drop and recreate fn_get_student_bookings with slot_id
DROP FUNCTION IF EXISTS fn_get_student_bookings(UUID);

CREATE OR REPLACE FUNCTION fn_get_student_bookings(
    p_student_id UUID
)
RETURNS TABLE (
    booking_id UUID,
    slot_id UUID,
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
        b.id as booking_id,
        b.slot_id,
        es.start_time as slot_time,
        COALESCE(o.title, 'Unknown Offer') as offer_title,
        c.company_name,
        e.name as event_name,
        b.status::TEXT,
        b.student_notes as notes,
        (es.start_time > NOW() + INTERVAL '24 hours' AND b.status = 'confirmed') as can_cancel
    FROM bookings b
    JOIN event_slots es ON es.id = b.slot_id
    LEFT JOIN offers o ON o.id = es.offer_id
    JOIN companies c ON c.id = es.company_id
    JOIN events e ON e.id = es.event_id
    WHERE b.student_id = p_student_id
    ORDER BY es.start_time DESC;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION fn_get_student_bookings(UUID) TO authenticated;