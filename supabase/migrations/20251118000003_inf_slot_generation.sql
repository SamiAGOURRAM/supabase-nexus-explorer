-- =====================================================
-- Migration: INF Event Slot Generation System
-- =====================================================
-- Description: 
--   Implements the INF event slot generation requirements:
--   - 15 slots per company (total across 2 sessions)
--   - 10 minutes per slot
--   - 5 minutes buffer between slots
--   - Capacity: 2 students per slot
--   - Split across 2 interview sessions
--
-- Date: 2025-01-17
-- =====================================================

-- Function to generate INF-compliant slots for all companies in an event
-- This ensures exactly 15 slots per company, split across 2 sessions
CREATE OR REPLACE FUNCTION fn_generate_inf_slots(
  p_event_id UUID,
  p_session1_start TIMESTAMPTZ,
  p_session1_end TIMESTAMPTZ,
  p_session2_start TIMESTAMPTZ,
  p_session2_end TIMESTAMPTZ
)
RETURNS TABLE (
  companies_processed INTEGER,
  total_slots_created INTEGER,
  session1_slots INTEGER,
  session2_slots INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company RECORD;
  v_slots_per_session INTEGER := 8; -- 8 slots in first session, 7 in second = 15 total
  v_interview_duration INTEGER := 10; -- 10 minutes per interview
  v_buffer_minutes INTEGER := 5; -- 5 minutes buffer
  v_capacity INTEGER := 2; -- 2 students per slot
  v_session1_id UUID;
  v_session2_id UUID;
  v_current_time TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_slot_interval INTERVAL;
  v_slots_created INTEGER := 0;
  v_session1_slots INTEGER := 0;
  v_session2_slots INTEGER := 0;
  v_companies_count INTEGER := 0;
  v_slot_count INTEGER;
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can generate INF slots';
  END IF;

  -- Verify event exists
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id) THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Validate time ranges
  IF p_session1_start >= p_session1_end THEN
    RAISE EXCEPTION 'Session 1: Start time must be before end time';
  END IF;
  
  IF p_session2_start >= p_session2_end THEN
    RAISE EXCEPTION 'Session 2: Start time must be before end time';
  END IF;

  -- Calculate slot interval (interview + buffer)
  v_slot_interval := (v_interview_duration + v_buffer_minutes) * INTERVAL '1 minute';

  -- Delete existing sessions for this event (will cascade delete slots)
  DELETE FROM speed_recruiting_sessions WHERE event_id = p_event_id;

  -- Create Session 1: Morning Session (8 slots per company)
  INSERT INTO speed_recruiting_sessions (
    event_id,
    name,
    start_time,
    end_time,
    interview_duration_minutes,
    buffer_minutes,
    slots_per_time,
    is_active
  ) VALUES (
    p_event_id,
    'First Interview Session',
    p_session1_start,
    p_session1_end,
    v_interview_duration,
    v_buffer_minutes,
    v_capacity,
    true
  ) RETURNING id INTO v_session1_id;

  -- Create Session 2: Afternoon Session (7 slots per company)
  INSERT INTO speed_recruiting_sessions (
    event_id,
    name,
    start_time,
    end_time,
    interview_duration_minutes,
    buffer_minutes,
    slots_per_time,
    is_active
  ) VALUES (
    p_event_id,
    'Second Interview Session',
    p_session2_start,
    p_session2_end,
    v_interview_duration,
    v_buffer_minutes,
    v_capacity,
    true
  ) RETURNING id INTO v_session2_id;

  -- Get all verified companies participating in this event
  FOR v_company IN
    SELECT DISTINCT c.id as company_id
    FROM companies c
    INNER JOIN event_participants ep ON ep.company_id = c.id
    WHERE ep.event_id = p_event_id
      AND c.is_verified = true
      AND c.verification_status = 'verified'
    ORDER BY c.company_name
  LOOP
    v_companies_count := v_companies_count + 1;
    v_slot_count := 0;

    -- Generate slots for Session 1 (8 slots)
    v_current_time := p_session1_start;
    WHILE v_slot_count < v_slots_per_session LOOP
      v_slot_end := v_current_time + (v_interview_duration * INTERVAL '1 minute');
      
      -- Don't create slot if it goes past session end
      IF v_slot_end > p_session1_end THEN
        EXIT;
      END IF;

      INSERT INTO event_slots (
        event_id,
        company_id,
        session_id,
        start_time,
        end_time,
        capacity,
        is_active
      ) VALUES (
        p_event_id,
        v_company.company_id,
        v_session1_id,
        v_current_time,
        v_slot_end,
        v_capacity,
        true
      );

      v_slot_count := v_slot_count + 1;
      v_slots_created := v_slots_created + 1;
      v_session1_slots := v_session1_slots + 1;
      
      -- Move to next slot time (interview + buffer)
      v_current_time := v_current_time + v_slot_interval;
    END LOOP;

    -- Generate slots for Session 2 (7 slots to make 15 total)
    v_current_time := p_session2_start;
    v_slot_count := 0;
    WHILE v_slot_count < (15 - v_slots_per_session) LOOP
      v_slot_end := v_current_time + (v_interview_duration * INTERVAL '1 minute');
      
      -- Don't create slot if it goes past session end
      IF v_slot_end > p_session2_end THEN
        EXIT;
      END IF;

      INSERT INTO event_slots (
        event_id,
        company_id,
        session_id,
        start_time,
        end_time,
        capacity,
        is_active
      ) VALUES (
        p_event_id,
        v_company.company_id,
        v_session2_id,
        v_current_time,
        v_slot_end,
        v_capacity,
        true
      );

      v_slot_count := v_slot_count + 1;
      v_slots_created := v_slots_created + 1;
      v_session2_slots := v_session2_slots + 1;
      
      -- Move to next slot time (interview + buffer)
      v_current_time := v_current_time + v_slot_interval;
    END LOOP;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT 
    v_companies_count,
    v_slots_created,
    v_session1_slots,
    v_session2_slots,
    format('Generated %s slots for %s companies (Session 1: %s slots, Session 2: %s slots)', 
           v_slots_created, v_companies_count, v_session1_slots, v_session2_slots)::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fn_generate_inf_slots(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Add comment
COMMENT ON FUNCTION fn_generate_inf_slots IS 
'Generates INF-compliant interview slots: 15 slots per company (8 in first session, 7 in second), 10min slots, 5min buffer, capacity 2 students per slot. Only for verified companies participating in the event.';

-- Ensure booking limit is set to 6 for INF events
-- Update events table to have phase2_max_bookings = 6 by default
-- (This should already be in place, but we ensure it here)
DO $$
BEGIN
  -- Update existing events to have 6 max bookings if not set
  UPDATE events
  SET phase2_max_bookings = 6
  WHERE phase2_max_bookings IS NULL OR phase2_max_bookings < 6;
END $$;

