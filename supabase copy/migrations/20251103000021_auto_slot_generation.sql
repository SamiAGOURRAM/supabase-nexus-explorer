-- Migration 21: Auto Slot Generation & Simplified Company Flow
-- This migration creates the event_participants table and auto-generates slots when companies are invited

-- Create event_participants table (replaces complex event_registrations)
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Who invited them
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Optional metadata
    booth_location TEXT,
    num_recruiters INTEGER DEFAULT 1,
    notes TEXT,  -- Admin notes
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(event_id, company_id)
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_company ON event_participants(company_id);

-- Enable RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage event participants"
    ON event_participants
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Companies can view their participations
CREATE POLICY "Companies can view their participations"
    ON event_participants
    FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM companies WHERE profile_id = auth.uid()
        )
    );

-- Students can view participants
CREATE POLICY "Students can view event participants"
    ON event_participants
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
    );

-- Comments
COMMENT ON TABLE event_participants IS 
    'Simple list of companies participating in events. Replaces complex event_registrations with approval workflow.';

-- Trigger: Auto-generate slots when company is added to event
CREATE OR REPLACE FUNCTION fn_auto_generate_slots_on_invite()
RETURNS TRIGGER AS $$
DECLARE
    v_session RECORD;
    v_slots_created INTEGER := 0;
    v_total_created INTEGER := 0;
BEGIN
    -- For each active session in this event
    FOR v_session IN 
        SELECT * FROM speed_recruiting_sessions 
        WHERE event_id = NEW.event_id 
          AND is_active = true
        ORDER BY start_time
    LOOP
        -- Generate slots for this company in this session
        v_slots_created := fn_generate_slots_for_session(
            v_session.id,
            NEW.company_id
        );
        
        v_total_created := v_total_created + v_slots_created;
        
        RAISE NOTICE 'Generated % slots for company % in session %', 
            v_slots_created, NEW.company_id, v_session.name;
    END LOOP;
    
    RAISE NOTICE 'Total slots created: %', v_total_created;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_slots_on_company_invite
    AFTER INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_generate_slots_on_invite();

COMMENT ON TRIGGER auto_generate_slots_on_company_invite ON event_participants IS 
    'Automatically generates interview slots for all sessions when a company is invited to an event';

-- Trigger: Auto-generate slots when new session is created
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

CREATE TRIGGER auto_generate_slots_on_session_create
    AFTER INSERT ON speed_recruiting_sessions
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_generate_slots_on_session_create();

COMMENT ON TRIGGER auto_generate_slots_on_session_create ON speed_recruiting_sessions IS 
    'Automatically generates slots for all registered companies when a new session is created';

-- Trigger: Regenerate slots when session is updated
CREATE OR REPLACE FUNCTION fn_auto_regenerate_slots_on_session_update()
RETURNS TRIGGER AS $$
DECLARE
    v_company RECORD;
    v_slots_created INTEGER := 0;
    v_total_created INTEGER := 0;
BEGIN
    -- Only regenerate if time or capacity settings changed
    IF OLD.start_time IS DISTINCT FROM NEW.start_time
       OR OLD.end_time IS DISTINCT FROM NEW.end_time
       OR OLD.interview_duration_minutes IS DISTINCT FROM NEW.interview_duration_minutes
       OR OLD.buffer_minutes IS DISTINCT FROM NEW.buffer_minutes
       OR OLD.slots_per_time IS DISTINCT FROM NEW.slots_per_time
    THEN
        -- Delete existing slots for this session
        DELETE FROM event_slots WHERE session_id = NEW.id;
        
        -- Regenerate for all companies (if session is active)
        IF NEW.is_active = true THEN
            FOR v_company IN
                SELECT DISTINCT company_id
                FROM event_participants
                WHERE event_id = NEW.event_id
            LOOP
                v_slots_created := fn_generate_slots_for_session(
                    NEW.id,
                    v_company.company_id
                );
                
                v_total_created := v_total_created + v_slots_created;
            END LOOP;
            
            RAISE NOTICE 'Auto-regenerated % slots for updated session %', v_total_created, NEW.name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_regenerate_slots_on_session_update
    AFTER UPDATE ON speed_recruiting_sessions
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_regenerate_slots_on_session_update();

COMMENT ON TRIGGER auto_regenerate_slots_on_session_update ON speed_recruiting_sessions IS 
    'Automatically regenerates slots when session configuration changes';

-- Migrate existing event_registrations to event_participants (if they exist)
-- Only migrate approved registrations
INSERT INTO event_participants (event_id, company_id, invited_at)
SELECT 
    event_id,
    company_id,
    COALESCE(approved_at, registered_at)
FROM event_registrations
WHERE status = 'approved'
ON CONFLICT (event_id, company_id) DO NOTHING;
