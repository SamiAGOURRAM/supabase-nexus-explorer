-- =====================================================
-- RESTORE AUTO-SLOT GENERATION ON SESSION CREATE
-- =====================================================
-- This ensures that when an admin creates a session,
-- slots are automatically generated for all participating companies
-- with proper offer_id linking

-- Function to auto-generate slots when a new session is created
CREATE OR REPLACE FUNCTION fn_auto_generate_slots_on_session_create()
RETURNS TRIGGER AS $$
DECLARE
    v_company RECORD;
    v_slots_created INTEGER := 0;
    v_total_created INTEGER := 0;
BEGIN
    -- Only proceed if session is active
    IF NEW.is_active = false THEN
        RETURN NEW;
    END IF;
    
    -- For each company registered for this event
    FOR v_company IN
        SELECT DISTINCT company_id
        FROM event_participants
        WHERE event_id = NEW.event_id
    LOOP
        -- Generate slots for this company in this new session
        -- This function already handles offer_id linking
        v_slots_created := fn_generate_slots_for_session(
            NEW.id,
            v_company.company_id
        );
        
        v_total_created := v_total_created + v_slots_created;
    END LOOP;
    
    RAISE NOTICE 'Auto-generated % total slots for new session %', v_total_created, NEW.name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_generate_slots_on_session_create ON speed_recruiting_sessions;

CREATE TRIGGER auto_generate_slots_on_session_create
    AFTER INSERT ON speed_recruiting_sessions
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_generate_slots_on_session_create();

COMMENT ON TRIGGER auto_generate_slots_on_session_create ON speed_recruiting_sessions IS 
    'Automatically generates slots for all registered companies when a new session is created. Slots are linked to company offers.';

