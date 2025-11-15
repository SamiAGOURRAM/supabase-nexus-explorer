-- ============================================
-- SLOT CONSISTENCY & AUTO-PROPAGATION SYSTEM
-- ============================================

-- 1. CASCADE DELETE: When session is deleted, automatically delete its slots
ALTER TABLE event_slots
DROP CONSTRAINT IF EXISTS event_slots_session_id_fkey,
ADD CONSTRAINT event_slots_session_id_fkey
  FOREIGN KEY (session_id) 
  REFERENCES speed_recruiting_sessions(id) 
  ON DELETE CASCADE;

-- 2. AUTO-PROPAGATE SLOTS: When company joins event, copy all session slots to them
CREATE OR REPLACE FUNCTION fn_propagate_slots_to_new_participant()
RETURNS TRIGGER AS $$
DECLARE
  v_session RECORD;
  v_slots_created INTEGER := 0;
  v_current_time TIMESTAMPTZ;
  v_slot_duration INTERVAL;
BEGIN
  -- For each active session in this event, generate slots for the new company
  FOR v_session IN 
    SELECT * FROM speed_recruiting_sessions 
    WHERE event_id = NEW.event_id AND is_active = true
    ORDER BY start_time
  LOOP
    -- Calculate slot duration
    v_slot_duration := (v_session.interview_duration_minutes + v_session.buffer_minutes) * INTERVAL '1 minute';
    v_current_time := v_session.start_time;
    
    -- Generate time slots for this session and this company
    WHILE v_current_time + (v_session.interview_duration_minutes * INTERVAL '1 minute') <= v_session.end_time LOOP
      INSERT INTO event_slots (
        event_id, company_id, session_id,
        start_time, end_time, capacity, is_active, offer_id
      ) VALUES (
        v_session.event_id,
        NEW.company_id,
        v_session.id,
        v_current_time,
        v_current_time + (v_session.interview_duration_minutes * INTERVAL '1 minute'),
        v_session.slots_per_time,
        true,
        NULL
      );
      
      v_slots_created := v_slots_created + 1;
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Auto-generated % slots for new company % in event %', 
    v_slots_created, NEW.company_id, NEW.event_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_propagate_slots_to_participant
AFTER INSERT ON event_participants
FOR EACH ROW
EXECUTE FUNCTION fn_propagate_slots_to_new_participant();

-- 3. BULK REGENERATION: Admin can regenerate all slots for a session
CREATE OR REPLACE FUNCTION fn_regenerate_event_slots(
  p_session_id UUID
)
RETURNS TABLE(slots_created INTEGER, companies_affected INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_slots_created INTEGER := 0;
  v_companies INTEGER := 0;
  v_current_time TIMESTAMPTZ;
  v_slot_duration INTERVAL;
  v_company RECORD;
BEGIN
  -- Get session details
  SELECT * INTO v_session
  FROM speed_recruiting_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Delete existing slots WITHOUT bookings
  DELETE FROM event_slots
  WHERE session_id = p_session_id
    AND NOT EXISTS (
      SELECT 1 FROM interview_bookings 
      WHERE slot_id = event_slots.id AND status = 'confirmed'
    );
  
  -- Calculate slot duration
  v_slot_duration := (v_session.interview_duration_minutes + v_session.buffer_minutes) * INTERVAL '1 minute';
  v_current_time := v_session.start_time;
  
  -- Generate slots for all participating companies
  FOR v_company IN
    SELECT DISTINCT company_id
    FROM event_participants
    WHERE event_id = v_session.event_id
  LOOP
    v_current_time := v_session.start_time;
    
    WHILE v_current_time + (v_session.interview_duration_minutes * INTERVAL '1 minute') <= v_session.end_time LOOP
      INSERT INTO event_slots (
        event_id, company_id, session_id,
        start_time, end_time, capacity, is_active, offer_id
      ) VALUES (
        v_session.event_id,
        v_company.company_id,
        v_session.id,
        v_current_time,
        v_current_time + (v_session.interview_duration_minutes * INTERVAL '1 minute'),
        v_session.slots_per_time,
        true,
        NULL
      );
      
      v_slots_created := v_slots_created + 1;
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
    
    v_companies := v_companies + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_slots_created, v_companies;
END;
$$;

-- 4. CLEAN UP OLD AUTO-GENERATION TRIGGERS (if they exist)
DROP TRIGGER IF EXISTS trg_auto_generate_slots_on_invite ON event_participants;
DROP TRIGGER IF EXISTS trg_auto_generate_slots_on_session_create ON speed_recruiting_sessions;
DROP TRIGGER IF EXISTS trg_auto_regenerate_slots_on_session_update ON speed_recruiting_sessions;

-- Note: We're NOT auto-regenerating on session update because:
-- 1. It could delete slots with bookings (data loss)
-- 2. Admin should explicitly regenerate after reviewing impact
-- Admin will use the "Regenerate Slots" button instead