-- Function to get available slots with accurate booking counts
-- This bypasses RLS so students can see true slot availability
CREATE OR REPLACE FUNCTION fn_get_available_slots(
    p_company_id UUID,
    p_event_id UUID
)
RETURNS TABLE(
    id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    location TEXT,
    capacity INTEGER,
    offer_id UUID,
    company_id UUID,
    event_id UUID,
    is_active BOOLEAN,
    confirmed_bookings_count INTEGER,
    available_spots INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.id,
        es.start_time,
        es.end_time,
        es.location,
        es.capacity,
        es.offer_id,
        es.company_id,
        es.event_id,
        es.is_active,
        COALESCE(
            (SELECT COUNT(*)::INTEGER 
             FROM bookings b 
             WHERE b.slot_id = es.id 
             AND b.status = 'confirmed'),
            0
        ) as confirmed_bookings_count,
        (es.capacity - COALESCE(
            (SELECT COUNT(*)::INTEGER 
             FROM bookings b 
             WHERE b.slot_id = es.id 
             AND b.status = 'confirmed'),
            0
        )) as available_spots
    FROM event_slots es
    WHERE es.company_id = p_company_id
      AND es.event_id = p_event_id
      AND es.is_active = true
      AND es.start_time >= NOW()
      -- Only return slots that have available capacity
      AND es.capacity > COALESCE(
          (SELECT COUNT(*)::INTEGER 
           FROM bookings b 
           WHERE b.slot_id = es.id 
           AND b.status = 'confirmed'),
          0
      )
    ORDER BY es.start_time ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fn_get_available_slots(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION fn_get_available_slots IS 
'Returns available interview slots with accurate booking counts for a company and event. Bypasses RLS to show true availability.';
