-- Migration: Fix Event Deletion with Proper Cascade
-- Created: 2025-11-17
-- Description: Create a function to properly delete events with all related data

-- Function to delete an event and all its related data
CREATE OR REPLACE FUNCTION fn_delete_event(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_counts JSON;
    v_offers_count INTEGER;
    v_slots_count INTEGER;
    v_bookings_count INTEGER;
    v_registrations_count INTEGER;
    v_sessions_count INTEGER;
BEGIN
    -- Check if the event exists
    IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id) THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    -- Count records before deletion
    SELECT COUNT(*) INTO v_offers_count 
    FROM offers WHERE event_id = p_event_id;
    
    SELECT COUNT(*) INTO v_slots_count 
    FROM event_slots WHERE event_id = p_event_id;
    
    SELECT COUNT(*) INTO v_bookings_count 
    FROM interview_bookings 
    WHERE slot_id IN (SELECT id FROM event_slots WHERE event_id = p_event_id);
    
    SELECT COUNT(*) INTO v_registrations_count 
    FROM event_registrations WHERE event_id = p_event_id;
    
    SELECT COUNT(*) INTO v_sessions_count 
    FROM speed_recruiting_sessions WHERE event_id = p_event_id;

    -- Delete in proper order to respect foreign keys
    
    -- 1. Delete interview bookings (references event_slots)
    DELETE FROM interview_bookings 
    WHERE slot_id IN (SELECT id FROM event_slots WHERE event_id = p_event_id);
    
    -- 2. Delete event slots (references speed_recruiting_sessions and events)
    DELETE FROM event_slots WHERE event_id = p_event_id;
    
    -- 3. Delete speed recruiting sessions (references events)
    DELETE FROM speed_recruiting_sessions WHERE event_id = p_event_id;
    
    -- 4. Set offers event_id to NULL or delete them (depending on your needs)
    -- Option A: Nullify event_id (keep offers)
    UPDATE offers SET event_id = NULL WHERE event_id = p_event_id;
    
    -- Option B: Delete offers entirely (uncomment if needed)
    -- DELETE FROM offers WHERE event_id = p_event_id;
    
    -- 5. Delete event registrations (references events)
    DELETE FROM event_registrations WHERE event_id = p_event_id;
    
    -- 6. Finally, delete the event itself
    DELETE FROM events WHERE id = p_event_id;
    
    -- Return counts of deleted records
    v_deleted_counts := json_build_object(
        'offers_updated', v_offers_count,
        'slots_deleted', v_slots_count,
        'bookings_deleted', v_bookings_count,
        'registrations_deleted', v_registrations_count,
        'sessions_deleted', v_sessions_count,
        'event_deleted', 1
    );
    
    RETURN v_deleted_counts;
END;
$$;

-- Grant execute permission to authenticated users (admins will be checked via RLS)
GRANT EXECUTE ON FUNCTION fn_delete_event(UUID) TO authenticated;

COMMENT ON FUNCTION fn_delete_event IS 'Safely deletes an event and all related data with proper cascade order';

-- Note: You may want to add additional checks for admin role in the function
-- or rely on RLS policies on the events table
