-- Migration 19: Enhanced Phase System
-- This migration improves the phase management for student bookings

-- Add phase configuration columns to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS phase_mode TEXT DEFAULT 'manual' 
  CHECK (phase_mode IN ('manual', 'date-based'));

-- Rename existing columns for clarity (if they exist with old names)
-- Keep backward compatibility
DO $$ 
BEGIN
  -- Check if old column names exist and rename them
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'events' AND column_name = 'phase1_booking_limit') THEN
    ALTER TABLE events RENAME COLUMN phase1_booking_limit TO phase1_max_bookings;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'events' AND column_name = 'phase2_booking_limit') THEN
    ALTER TABLE events RENAME COLUMN phase2_booking_limit TO phase2_max_bookings;
  END IF;
END $$;

-- Add columns if they don't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS phase1_max_bookings INTEGER DEFAULT 3;
ALTER TABLE events ADD COLUMN IF NOT EXISTS phase2_max_bookings INTEGER DEFAULT 6;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_phase INTEGER DEFAULT 0 
  CHECK (current_phase IN (0, 1, 2));

-- Phase dates (for date-based mode)
ALTER TABLE events ADD COLUMN IF NOT EXISTS phase1_start_date TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS phase1_end_date TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS phase2_start_date TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS phase2_end_date TIMESTAMPTZ;

-- Add helpful comments
COMMENT ON COLUMN events.current_phase IS 
  '0 = Closed (no bookings allowed), 1 = Phase 1 (priority students only), 2 = Phase 2 (all students)';
COMMENT ON COLUMN events.phase1_max_bookings IS 
  'Maximum interviews per student during Phase 1 (e.g., 3 for priority students)';
COMMENT ON COLUMN events.phase2_max_bookings IS 
  'Maximum interviews per student during Phase 2 (e.g., 6 for all students)';
COMMENT ON COLUMN events.phase_mode IS 
  'manual = admin controls phase transitions manually, date-based = automatic based on configured dates';

-- Update existing events to have sensible defaults
UPDATE events 
SET 
  phase1_max_bookings = COALESCE(phase1_max_bookings, 3),
  phase2_max_bookings = COALESCE(phase2_max_bookings, 6),
  current_phase = COALESCE(current_phase, 1),
  phase_mode = COALESCE(phase_mode, 'manual')
WHERE phase1_max_bookings IS NULL OR phase2_max_bookings IS NULL;

-- Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS fn_check_student_booking_limit(UUID, UUID);

-- Create or replace the booking limit check function
CREATE OR REPLACE FUNCTION fn_check_student_booking_limit(
    p_student_id UUID,
    p_event_id UUID
)
RETURNS TABLE (
    can_book BOOLEAN,
    current_count INTEGER,
    max_allowed INTEGER,
    current_phase INTEGER,
    message TEXT
) AS $$
DECLARE
    v_current_phase INTEGER;
    v_max_allowed INTEGER;
    v_current_count INTEGER;
    v_phase_mode TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Get event phase configuration
    SELECT 
        e.current_phase,
        e.phase_mode,
        CASE 
            WHEN e.phase_mode = 'date-based' THEN
                -- Auto-determine phase based on dates
                CASE 
                    WHEN v_now < e.phase1_start_date THEN 0
                    WHEN v_now >= e.phase1_start_date AND v_now <= e.phase1_end_date THEN 1
                    WHEN v_now >= e.phase2_start_date AND v_now <= e.phase2_end_date THEN 2
                    ELSE 0  -- Outside all date ranges = closed
                END
            ELSE
                -- Use manual phase
                e.current_phase
        END,
        CASE 
            WHEN e.phase_mode = 'date-based' THEN
                CASE 
                    WHEN v_now >= e.phase1_start_date AND v_now <= e.phase1_end_date THEN e.phase1_max_bookings
                    WHEN v_now >= e.phase2_start_date AND v_now <= e.phase2_end_date THEN e.phase2_max_bookings
                    ELSE 0
                END
            ELSE
                CASE 
                    WHEN e.current_phase = 1 THEN e.phase1_max_bookings
                    WHEN e.current_phase = 2 THEN e.phase2_max_bookings
                    ELSE 0
                END
        END
    INTO v_phase_mode, v_current_phase, v_max_allowed
    FROM events e
    WHERE e.id = p_event_id;
    
    -- Phase 0 = bookings closed
    IF v_current_phase = 0 THEN
        RETURN QUERY SELECT 
            false,
            0,
            0,
            v_current_phase,
            'Bookings are currently closed for this event'::TEXT;
        RETURN;
    END IF;
    
    -- Count student's existing confirmed bookings for this event
    SELECT COUNT(*)
    INTO v_current_count
    FROM interview_bookings ib
    JOIN event_slots es ON es.id = ib.slot_id
    WHERE ib.student_id = p_student_id
      AND es.event_id = p_event_id
      AND ib.status = 'confirmed';
    
    -- Return result
    RETURN QUERY SELECT 
        (v_current_count < v_max_allowed),
        v_current_count,
        v_max_allowed,
        v_current_phase,
        CASE 
            WHEN v_current_count >= v_max_allowed THEN 
                format('You have reached the maximum of %s interviews for Phase %s', 
                       v_max_allowed, v_current_phase)
            ELSE 
                format('You can book %s more interview(s). Phase %s: %s/%s booked', 
                       v_max_allowed - v_current_count, 
                       v_current_phase, 
                       v_current_count, 
                       v_max_allowed)
        END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_check_student_booking_limit IS 
  'Checks if a student can book more interviews based on current phase and limits. Supports both manual and date-based phase modes.';
