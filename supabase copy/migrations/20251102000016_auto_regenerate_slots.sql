-- Migration: Auto-Regenerate Event Slots
-- Created: 2025-11-02
-- Description: Automatically regenerate slots when companies are approved or offers change

-- 1. Function to auto-regenerate slots for an event
CREATE OR REPLACE FUNCTION fn_auto_regenerate_event_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
    v_result RECORD;
BEGIN
    -- Determine which event needs regeneration based on trigger context
    IF TG_TABLE_NAME = 'event_registrations' THEN
        -- Triggered by registration approval/rejection
        v_event_id := NEW.event_id;
        
        -- Only regenerate if status changed to 'approved' or 'rejected'
        IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected')) THEN
            RAISE NOTICE 'Auto-regenerating slots for event % (registration % changed to %)', 
                v_event_id, NEW.id, NEW.status;
        ELSIF TG_OP = 'INSERT' THEN
            -- Don't regenerate on new pending registrations
            RETURN NEW;
        ELSE
            RETURN NEW;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'offers' THEN
        -- Triggered by offer creation/update
        v_event_id := NEW.event_id;
        
        -- Only regenerate if offer is linked to an event
        IF v_event_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Only regenerate if is_active changed or new event-specific offer
        IF (TG_OP = 'UPDATE' AND OLD.is_active = NEW.is_active AND OLD.event_id = NEW.event_id) THEN
            RETURN NEW;
        END IF;
        
        RAISE NOTICE 'Auto-regenerating slots for event % (offer % changed)', 
            v_event_id, NEW.id;
            
    ELSIF TG_TABLE_NAME = 'event_time_ranges' THEN
        -- Triggered by time range addition/modification
        v_event_id := NEW.event_id;
        
        RAISE NOTICE 'Auto-regenerating slots for event % (time range modified)', 
            v_event_id;
            
    ELSIF TG_TABLE_NAME = 'events' THEN
        -- Triggered by event configuration change
        v_event_id := NEW.id;
        
        -- Only regenerate if slot-relevant fields changed
        IF (TG_OP = 'UPDATE' AND 
            OLD.interview_duration_minutes = NEW.interview_duration_minutes AND
            OLD.buffer_minutes = NEW.buffer_minutes AND
            OLD.slots_per_time = NEW.slots_per_time) THEN
            RETURN NEW;
        END IF;
        
        RAISE NOTICE 'Auto-regenerating slots for event % (config changed)', 
            v_event_id;
    END IF;
    
    -- Execute regeneration (async via pg_notify would be better for production)
    BEGIN
        SELECT * INTO v_result FROM fn_generate_event_slots(v_event_id);
        RAISE NOTICE 'Generated % slots for % companies across % time ranges', 
            v_result.slots_created, v_result.companies_processed, v_result.time_ranges_processed;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to regenerate slots for event %: %', v_event_id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- 2. Trigger on event_registrations (when status changes to approved/rejected)
DROP TRIGGER IF EXISTS trg_auto_regenerate_on_registration ON event_registrations;

CREATE TRIGGER trg_auto_regenerate_on_registration
AFTER INSERT OR UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION fn_auto_regenerate_event_slots();

-- 3. Trigger on offers (when event-specific offer is created/activated)
DROP TRIGGER IF EXISTS trg_auto_regenerate_on_offer ON offers;

CREATE TRIGGER trg_auto_regenerate_on_offer
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION fn_auto_regenerate_event_slots();

-- 4. Trigger on event_time_ranges (when time range added/modified)
DROP TRIGGER IF EXISTS trg_auto_regenerate_on_time_range ON event_time_ranges;

CREATE TRIGGER trg_auto_regenerate_on_time_range
AFTER INSERT OR UPDATE OR DELETE ON event_time_ranges
FOR EACH ROW
EXECUTE FUNCTION fn_auto_regenerate_event_slots();

-- 5. Trigger on events (when slot configuration changes)
DROP TRIGGER IF EXISTS trg_auto_regenerate_on_event_config ON events;

CREATE TRIGGER trg_auto_regenerate_on_event_config
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION fn_auto_regenerate_event_slots();

-- 6. Add a helper function to manually trigger regeneration (for admin UI)
CREATE OR REPLACE FUNCTION fn_trigger_slot_regeneration(p_event_id UUID)
RETURNS TABLE (
    slots_created INTEGER,
    time_ranges_processed INTEGER,
    companies_processed INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can manually regenerate slots';
    END IF;
    
    -- Execute regeneration
    SELECT * INTO v_result FROM fn_generate_event_slots(p_event_id);
    
    RETURN QUERY SELECT 
        v_result.slots_created,
        v_result.time_ranges_processed,
        v_result.companies_processed,
        'Slots regenerated successfully' AS message;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_trigger_slot_regeneration(UUID) TO authenticated;

COMMENT ON FUNCTION fn_auto_regenerate_event_slots() IS 
    'Automatically regenerates event slots when companies are approved, offers change, or event config is modified';

COMMENT ON FUNCTION fn_trigger_slot_regeneration(UUID) IS 
    'Manual fallback for admins to force slot regeneration (auto-regeneration should handle most cases)';
