-- Migration: Never Delete Slots - Only Add New Ones
-- Created: 2025-11-18
-- Problem: When creating a new offer, fn_generate_event_slots() deletes ALL slots including ones with bookings
-- Solution: NEVER delete slots. Only add new slots if they don't exist. Slots represent company availability.

-- Update fn_generate_event_slots to NEVER delete slots, only add missing ones
CREATE OR REPLACE FUNCTION fn_generate_event_slots(p_event_id UUID)
RETURNS TABLE (
    slots_created INTEGER,
    time_ranges_processed INTEGER,
    companies_processed INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_time_range RECORD;
    v_company RECORD;
    v_current_slot_time TIMESTAMPTZ;
    v_end_datetime TIMESTAMPTZ;
    v_slot_interval INTERVAL;
    v_slots_count INTEGER := 0;
    v_ranges_count INTEGER := 0;
    v_companies_count INTEGER := 0;
BEGIN
    -- Get event details
    SELECT interview_duration_minutes, buffer_minutes, slots_per_time
    INTO v_event
    FROM events
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    -- Calculate total interval (interview + buffer)
    v_slot_interval := (v_event.interview_duration_minutes + v_event.buffer_minutes) * INTERVAL '1 minute';

    -- ✅ CRITICAL FIX: NEVER DELETE SLOTS
    -- Slots represent company availability and students book interviews on them
    -- Creating new offers should only ADD slots, never remove existing ones
    -- If you need to delete slots, do it manually through admin interface
    RAISE NOTICE '🔒 Preserving ALL existing slots for event. Only adding new slots if needed.';

    -- Count approved companies registered for this event with active offers
    SELECT COUNT(DISTINCT er.company_id) INTO v_companies_count
    FROM event_registrations er
    INNER JOIN companies c ON c.id = er.company_id
    INNER JOIN offers o ON o.company_id = c.id
    WHERE er.event_id = p_event_id
      AND er.status = 'approved'
      AND c.verification_status = 'verified'
      AND o.is_active = true
      AND (o.event_id = p_event_id OR o.event_id IS NULL); -- Accept event-specific or general offers

    -- Loop through all time ranges for this event
    FOR v_time_range IN
        SELECT day_date, start_time, end_time
        FROM event_time_ranges
        WHERE event_id = p_event_id
        ORDER BY day_date, start_time
    LOOP
        v_ranges_count := v_ranges_count + 1;
        
        -- Combine date and start time
        v_current_slot_time := v_time_range.day_date + v_time_range.start_time;
        v_end_datetime := v_time_range.day_date + v_time_range.end_time;

        -- Generate slots for this time range
        WHILE v_current_slot_time + (v_event.interview_duration_minutes * INTERVAL '1 minute') <= v_end_datetime LOOP
            
            -- Create ONE slot per REGISTERED company with active offers
            FOR v_company IN
                SELECT DISTINCT c.id as company_id
                FROM event_registrations er
                INNER JOIN companies c ON c.id = er.company_id
                INNER JOIN offers o ON o.company_id = c.id
                WHERE er.event_id = p_event_id
                  AND er.status = 'approved'
                  AND c.verification_status = 'verified'
                  AND o.is_active = true
                  AND (o.event_id = p_event_id OR o.event_id IS NULL)
            LOOP
                -- ✅ Check if a slot already exists for this time/company (with bookings)
                -- If it exists, skip it to preserve bookings
                IF NOT EXISTS (
                    SELECT 1 FROM event_slots
                    WHERE event_id = p_event_id
                      AND company_id = v_company.company_id
                      AND start_time = v_current_slot_time
                ) THEN
                    -- Insert new slot for this company at this time
                    INSERT INTO event_slots (
                        event_id, 
                        company_id, 
                        start_time,
                        end_time,
                        capacity,
                        is_active
                    ) VALUES (
                        p_event_id,
                        v_company.company_id,
                        v_current_slot_time,
                        v_current_slot_time + (v_event.interview_duration_minutes * INTERVAL '1 minute'),
                        v_event.slots_per_time,
                        true
                    );
                    
                    v_slots_count := v_slots_count + 1;
                END IF;
            END LOOP;

            -- Move to next time slot
            v_current_slot_time := v_current_slot_time + v_slot_interval;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Generated % new slots for % companies across % time ranges (preserved existing bookings)', 
        v_slots_count, v_companies_count, v_ranges_count;

    RETURN QUERY SELECT v_slots_count, v_ranges_count, v_companies_count;
END;
$$;

COMMENT ON FUNCTION fn_generate_event_slots(UUID) IS 
    'Generates interview slots for an event. NEVER deletes existing slots. Only adds missing slots. Slots represent company time availability and should persist.';

-- ✅ Summary
-- This migration fixes the critical bug where creating a new offer would delete ALL slots (including booked ones)
-- Now it:
-- 1. NEVER deletes any slots (booked or unbooked)
-- 2. Only adds new slots if they don't already exist for that time/company
-- 3. Slots represent company availability and should be managed manually if deletion is needed
-- 4. Multiple offers can exist for the same company - slots are shared across all offers

