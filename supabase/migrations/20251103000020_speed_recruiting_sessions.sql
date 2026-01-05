-- Migration 20: Speed Recruiting Sessions
-- This migration adds support for multiple time-bounded speed recruiting sessions within an event

-- Create speed_recruiting_sessions table
CREATE TABLE IF NOT EXISTS speed_recruiting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Session Details
    name TEXT NOT NULL,  -- e.g., "Morning Session", "Afternoon Session"
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Interview Configuration (per session)
    interview_duration_minutes INTEGER NOT NULL DEFAULT 15,
    buffer_minutes INTEGER NOT NULL DEFAULT 5,
    slots_per_time INTEGER NOT NULL DEFAULT 2,  -- Capacity per slot
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT positive_duration CHECK (interview_duration_minutes > 0),
    CONSTRAINT positive_buffer CHECK (buffer_minutes >= 0),
    CONSTRAINT positive_capacity CHECK (slots_per_time > 0)
);

-- Add session_id to event_slots (optional, for linking slots to sessions)
ALTER TABLE event_slots ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES speed_recruiting_sessions(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_event ON speed_recruiting_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_time ON speed_recruiting_sessions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_slots_session ON event_slots(session_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON speed_recruiting_sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON speed_recruiting_sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE speed_recruiting_sessions IS 
    'Defines time-bounded speed recruiting sessions within an event. Each session has its own schedule and interview configuration.';
COMMENT ON COLUMN speed_recruiting_sessions.name IS 
    'Display name for the session (e.g., "Morning Session", "Afternoon Block")';
COMMENT ON COLUMN speed_recruiting_sessions.interview_duration_minutes IS 
    'Duration of each interview in minutes';
COMMENT ON COLUMN speed_recruiting_sessions.buffer_minutes IS 
    'Break time between consecutive interviews';
COMMENT ON COLUMN speed_recruiting_sessions.slots_per_time IS 
    'Number of students that can be interviewed simultaneously (capacity per time slot)';
COMMENT ON COLUMN event_slots.session_id IS 
    'Links this slot to a specific speed recruiting session (NULL for slots not part of any session)';

-- RLS Policies
ALTER TABLE speed_recruiting_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage speed recruiting sessions" ON speed_recruiting_sessions;
DROP POLICY IF EXISTS "Anyone can view active speed recruiting sessions" ON speed_recruiting_sessions;

-- Admins can manage sessions
CREATE POLICY "Admins can manage speed recruiting sessions"
    ON speed_recruiting_sessions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Everyone can view active sessions
CREATE POLICY "Anyone can view active speed recruiting sessions"
    ON speed_recruiting_sessions
    FOR SELECT
    USING (is_active = true);

-- Function to generate slots for a session
CREATE OR REPLACE FUNCTION fn_generate_slots_for_session(
    p_session_id UUID,
    p_company_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_session RECORD;
    v_event_id UUID;
    v_current_time TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_slot_duration INTERVAL;
    v_slots_created INTEGER := 0;
BEGIN
    -- Get session details
    SELECT 
        s.*,
        s.event_id
    INTO v_session
    FROM speed_recruiting_sessions s
    WHERE s.id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;
    
    -- Calculate slot duration (interview + buffer)
    v_slot_duration := (v_session.interview_duration_minutes + v_session.buffer_minutes) * INTERVAL '1 minute';
    
    -- Initialize current time
    v_current_time := v_session.start_time;
    
    -- Generate slots until end_time
    WHILE v_current_time < v_session.end_time LOOP
        -- Calculate slot end time (interview duration only, not including buffer)
        v_slot_end := v_current_time + (v_session.interview_duration_minutes * INTERVAL '1 minute');
        
        -- Don't create slot if it goes past session end
        EXIT WHEN v_slot_end > v_session.end_time;
        
        -- Insert slot
        INSERT INTO event_slots (
            event_id,
            company_id,
            session_id,
            start_time,
            end_time,
            capacity,
            is_active
        ) VALUES (
            v_session.event_id,
            p_company_id,
            p_session_id,
            v_current_time,
            v_slot_end,
            v_session.slots_per_time,
            true
        );
        
        v_slots_created := v_slots_created + 1;
        
        -- Move to next slot time (interview + buffer)
        v_current_time := v_current_time + v_slot_duration;
    END LOOP;
    
    RETURN v_slots_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_generate_slots_for_session IS 
    'Generates interview slots for a company within a specific speed recruiting session';

-- Function to regenerate all slots for an event's sessions
CREATE OR REPLACE FUNCTION fn_regenerate_session_slots(
    p_event_id UUID
)
RETURNS TABLE (
    session_name TEXT,
    company_count INTEGER,
    slots_per_company INTEGER,
    total_slots INTEGER
) AS $$
DECLARE
    v_session RECORD;
    v_company RECORD;
    v_slots_created INTEGER;
BEGIN
    -- Delete existing slots linked to sessions for this event
    DELETE FROM event_slots 
    WHERE event_id = p_event_id 
      AND session_id IS NOT NULL;
    
    -- For each session
    FOR v_session IN 
        SELECT * FROM speed_recruiting_sessions 
        WHERE event_id = p_event_id AND is_active = true
        ORDER BY start_time
    LOOP
        v_slots_created := 0;
        
        -- Get companies registered for this event
        FOR v_company IN
            SELECT DISTINCT c.id, c.name
            FROM companies c
            JOIN event_participants ep ON ep.company_id = c.id
            WHERE ep.event_id = p_event_id
        LOOP
            -- Generate slots for this company in this session
            v_slots_created := v_slots_created + fn_generate_slots_for_session(
                v_session.id,
                v_company.id
            );
        END LOOP;
        
        -- Return stats for this session
        RETURN QUERY SELECT 
            v_session.name,
            (SELECT COUNT(DISTINCT company_id) FROM event_slots WHERE session_id = v_session.id)::INTEGER,
            (SELECT COUNT(*) FROM event_slots WHERE session_id = v_session.id AND company_id = (SELECT id FROM companies LIMIT 1))::INTEGER,
            v_slots_created;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_regenerate_session_slots IS 
    'Regenerates all interview slots for all sessions in an event';
