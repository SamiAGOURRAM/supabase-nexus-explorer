-- Move current event to Phase 2 (URGENT FIX)
UPDATE events 
SET current_phase = 2 
WHERE is_active = true AND current_phase = 1;

-- Create automatic phase transition function
CREATE OR REPLACE FUNCTION fn_auto_transition_event_phases()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Transition to Phase 1 if within phase 1 window
  UPDATE events
  SET current_phase = 1
  WHERE is_active = true
    AND phase_mode = 'auto'
    AND NOW() >= phase1_start_date
    AND NOW() < phase1_end_date
    AND current_phase = 0;

  -- Transition to Phase 2 if within phase 2 window
  UPDATE events
  SET current_phase = 2
  WHERE is_active = true
    AND phase_mode = 'auto'
    AND NOW() >= phase2_start_date
    AND NOW() < phase2_end_date
    AND current_phase IN (0, 1);

  -- Close booking if past phase 2
  UPDATE events
  SET current_phase = 0
  WHERE is_active = true
    AND phase_mode = 'auto'
    AND NOW() >= phase2_end_date
    AND current_phase IN (1, 2);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fn_auto_transition_event_phases() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_auto_transition_event_phases() TO anon;