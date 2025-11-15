-- =====================================================
-- COMPREHENSIVE FIX: Slot Generation & Offer Linking
-- Phases 1-3: Fix functions + Backfill data
-- =====================================================

-- PHASE 1.1: Fix fn_generate_slots_for_session
CREATE OR REPLACE FUNCTION public.fn_generate_slots_for_session(p_session_id uuid, p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_session RECORD;
    v_event_id UUID;
    v_current_time TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_slot_duration INTERVAL;
    v_slots_created INTEGER := 0;
    v_offer_id UUID;
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
    
    -- Get company's active offer for this event
    SELECT o.id INTO v_offer_id
    FROM offers o
    WHERE o.company_id = p_company_id
      AND o.event_id = v_session.event_id
      AND o.is_active = true
    ORDER BY o.created_at DESC
    LIMIT 1;
    
    IF v_offer_id IS NULL THEN
        RAISE NOTICE 'No active offer found for company % in event %', p_company_id, v_session.event_id;
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
        
        -- Insert slot WITH offer_id
        INSERT INTO event_slots (
            event_id,
            company_id,
            session_id,
            start_time,
            end_time,
            capacity,
            is_active,
            offer_id
        ) VALUES (
            v_session.event_id,
            p_company_id,
            p_session_id,
            v_current_time,
            v_slot_end,
            v_session.slots_per_time,
            true,
            v_offer_id
        );
        
        v_slots_created := v_slots_created + 1;
        
        -- Move to next slot time (interview + buffer)
        v_current_time := v_current_time + v_slot_duration;
    END LOOP;
    
    RAISE NOTICE 'Created % slots with offer_id: %', v_slots_created, v_offer_id;
    
    RETURN v_slots_created;
END;
$function$;

-- PHASE 1.2: Fix fn_propagate_slots_to_new_participant
CREATE OR REPLACE FUNCTION public.fn_propagate_slots_to_new_participant()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_session RECORD;
  v_slots_created INTEGER := 0;
  v_current_time TIMESTAMPTZ;
  v_slot_duration INTERVAL;
  v_offer_id UUID;
BEGIN
  -- Get company's active offer for this event
  SELECT o.id INTO v_offer_id
  FROM offers o
  WHERE o.company_id = NEW.company_id
    AND o.event_id = NEW.event_id
    AND o.is_active = true
  ORDER BY o.created_at DESC
  LIMIT 1;
  
  IF v_offer_id IS NULL THEN
    RAISE NOTICE 'No active offer found for company % in event %', NEW.company_id, NEW.event_id;
  END IF;
  
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
        v_offer_id
      );
      
      v_slots_created := v_slots_created + 1;
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Auto-generated % slots with offer_id % for new company % in event %', 
    v_slots_created, v_offer_id, NEW.company_id, NEW.event_id;
  
  RETURN NEW;
END;
$function$;

-- PHASE 1.3: Fix fn_regenerate_event_slots
CREATE OR REPLACE FUNCTION public.fn_regenerate_event_slots(p_session_id uuid)
RETURNS TABLE(slots_created integer, companies_affected integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session RECORD;
  v_slots_created INTEGER := 0;
  v_companies INTEGER := 0;
  v_current_time TIMESTAMPTZ;
  v_slot_duration INTERVAL;
  v_company RECORD;
  v_offer_id UUID;
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
      SELECT 1 FROM bookings 
      WHERE slot_id = event_slots.id AND status = 'confirmed'
    );
  
  -- Calculate slot duration
  v_slot_duration := (v_session.interview_duration_minutes + v_session.buffer_minutes) * INTERVAL '1 minute';
  
  -- Generate slots for all participating companies
  FOR v_company IN
    SELECT DISTINCT company_id
    FROM event_participants
    WHERE event_id = v_session.event_id
  LOOP
    -- Get company's active offer for this event
    SELECT o.id INTO v_offer_id
    FROM offers o
    WHERE o.company_id = v_company.company_id
      AND o.event_id = v_session.event_id
      AND o.is_active = true
    ORDER BY o.created_at DESC
    LIMIT 1;
    
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
        v_offer_id
      );
      
      v_slots_created := v_slots_created + 1;
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
    
    v_companies := v_companies + 1;
  END LOOP;
  
  RAISE NOTICE 'Regenerated % slots for % companies', v_slots_created, v_companies;
  
  RETURN QUERY SELECT v_slots_created, v_companies;
END;
$function$;

-- PHASE 2: Backfill existing slots with offer_id
DO $$ 
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update all existing slots to link to their company's active offer
  UPDATE event_slots es
  SET offer_id = (
    SELECT o.id
    FROM offers o
    WHERE o.company_id = es.company_id
      AND o.event_id = es.event_id
      AND o.is_active = true
    ORDER BY o.created_at DESC
    LIMIT 1
  )
  WHERE es.offer_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Backfilled offer_id for % existing slots', v_updated_count;
END $$;

-- Verification: Show results
DO $$
DECLARE
  v_slots_with_offers INTEGER;
  v_slots_without_offers INTEGER;
  v_total_slots INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_slots FROM event_slots;
  SELECT COUNT(*) INTO v_slots_with_offers FROM event_slots WHERE offer_id IS NOT NULL;
  SELECT COUNT(*) INTO v_slots_without_offers FROM event_slots WHERE offer_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE 'Total slots: %', v_total_slots;
  RAISE NOTICE 'Slots with offers: %', v_slots_with_offers;
  RAISE NOTICE 'Slots without offers: %', v_slots_without_offers;
  RAISE NOTICE '========================================';
END $$;