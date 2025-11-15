-- Migration: Enhanced Event Slots Management
-- Created: 2025-11-01
-- Description: Add support for multiple time ranges per day, dynamic slot generation with buffers

-- Add new columns to events table for better slot management (if they don't exist)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS interview_duration_minutes INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS slots_per_time INTEGER DEFAULT 2;

-- Add comments
COMMENT ON COLUMN events.interview_duration_minutes IS 'Duration of each interview in minutes';
COMMENT ON COLUMN events.buffer_minutes IS 'Buffer time between interviews in minutes';
COMMENT ON COLUMN events.slots_per_time IS 'Number of simultaneous interviews per time slot';

-- Create a table for time ranges (multiple ranges per event)
CREATE TABLE IF NOT EXISTS event_time_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    day_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_event_time_ranges_event ON event_time_ranges(event_id);
CREATE INDEX idx_event_time_ranges_date ON event_time_ranges(day_date);

-- Drop existing function and recreate with new logic
DROP FUNCTION IF EXISTS fn_generate_event_slots(UUID);

-- Enhanced slot generation function
CREATE OR REPLACE FUNCTION fn_generate_event_slots(p_event_id UUID)
RETURNS TABLE (
    slots_created INTEGER,
    time_ranges_processed INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_time_range RECORD;
    v_current_slot_time TIMESTAMPTZ;
    v_end_datetime TIMESTAMPTZ;
    v_slot_interval INTERVAL;
    v_slots_count INTEGER := 0;
    v_ranges_count INTEGER := 0;
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

    -- Delete existing slots for this event
    DELETE FROM event_slots WHERE event_id = p_event_id;

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
            INSERT INTO event_slots (event_id, slot_time, capacity)
            VALUES (p_event_id, v_current_slot_time, v_event.slots_per_time);
            
            v_slots_count := v_slots_count + 1;
            v_current_slot_time := v_current_slot_time + v_slot_interval;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT v_slots_count, v_ranges_count;
END;
$$;

-- Function to add time range and regenerate slots
CREATE OR REPLACE FUNCTION fn_add_event_time_range(
    p_event_id UUID,
    p_day_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_range_id UUID;
BEGIN
    -- Validate inputs
    IF p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'End time must be after start time';
    END IF;

    -- Insert time range
    INSERT INTO event_time_ranges (event_id, day_date, start_time, end_time)
    VALUES (p_event_id, p_day_date, p_start_time, p_end_time)
    RETURNING id INTO v_range_id;

    -- Regenerate all slots for the event
    PERFORM fn_generate_event_slots(p_event_id);

    RETURN v_range_id;
END;
$$;

-- Function to delete time range and regenerate slots
CREATE OR REPLACE FUNCTION fn_delete_event_time_range(p_range_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    -- Get event_id before deletion
    SELECT event_id INTO v_event_id
    FROM event_time_ranges
    WHERE id = p_range_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Time range not found';
    END IF;

    -- Delete the range
    DELETE FROM event_time_ranges WHERE id = p_range_id;

    -- Regenerate slots
    PERFORM fn_generate_event_slots(v_event_id);
END;
$$;

-- Analytics function for admin dashboard
CREATE OR REPLACE FUNCTION fn_get_event_analytics(p_event_id UUID DEFAULT NULL)
RETURNS TABLE (
    event_id UUID,
    event_name TEXT,
    event_date TIMESTAMPTZ,
    total_slots INTEGER,
    booked_slots INTEGER,
    available_slots INTEGER,
    total_companies INTEGER,
    total_offers INTEGER,
    total_students INTEGER,
    booking_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH event_stats AS (
        SELECT 
            e.id,
            e.name,
            e.date,
            COUNT(DISTINCT es.id) as slot_count,
            COUNT(DISTINCT CASE WHEN ib.status = 'confirmed' THEN ib.id END) as booked_count,
            COUNT(DISTINCT o.company_id) as company_count,
            COUNT(DISTINCT o.id) as offer_count,
            COUNT(DISTINCT ib.student_id) as student_count
        FROM events e
        LEFT JOIN event_slots es ON e.id = es.event_id
        LEFT JOIN interview_bookings ib ON es.id = ib.slot_id
        LEFT JOIN offers o ON ib.offer_id = o.id
        WHERE p_event_id IS NULL OR e.id = p_event_id
        GROUP BY e.id, e.name, e.date
    )
    SELECT 
        es.id,
        es.name,
        es.date,
        es.slot_count::INTEGER,
        es.booked_count::INTEGER,
        (es.slot_count - es.booked_count)::INTEGER as available,
        es.company_count::INTEGER,
        es.offer_count::INTEGER,
        es.student_count::INTEGER,
        CASE 
            WHEN es.slot_count > 0 THEN ROUND((es.booked_count::NUMERIC / es.slot_count::NUMERIC) * 100, 2)
            ELSE 0
        END as booking_rate
    FROM event_stats es
    ORDER BY es.date DESC;
END;
$$;

-- Analytics function for company performance
CREATE OR REPLACE FUNCTION fn_get_company_analytics()
RETURNS TABLE (
    company_id UUID,
    company_name TEXT,
    total_offers INTEGER,
    active_offers INTEGER,
    total_bookings INTEGER,
    confirmed_bookings INTEGER,
    unique_students INTEGER,
    is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.company_name,
        COUNT(DISTINCT o.id)::INTEGER as total_offers,
        COUNT(DISTINCT CASE WHEN o.is_active THEN o.id END)::INTEGER as active_offers,
        COUNT(DISTINCT ib.id)::INTEGER as total_bookings,
        COUNT(DISTINCT CASE WHEN ib.status = 'confirmed' THEN ib.id END)::INTEGER as confirmed_bookings,
        COUNT(DISTINCT ib.student_id)::INTEGER as unique_students,
        c.is_verified
    FROM companies c
    LEFT JOIN offers o ON c.id = o.company_id
    LEFT JOIN interview_bookings ib ON o.id = ib.offer_id
    GROUP BY c.id, c.company_name, c.is_verified
    ORDER BY total_bookings DESC;
END;
$$;

-- Analytics function for student engagement
CREATE OR REPLACE FUNCTION fn_get_student_analytics()
RETURNS TABLE (
    total_students INTEGER,
    students_with_bookings INTEGER,
    total_bookings INTEGER,
    avg_bookings_per_student NUMERIC,
    students_by_specialization JSONB,
    students_by_graduation_year JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.id)::INTEGER,
        COUNT(DISTINCT ib.student_id)::INTEGER,
        COUNT(DISTINCT ib.id)::INTEGER,
        CASE 
            WHEN COUNT(DISTINCT ib.student_id) > 0 
            THEN ROUND(COUNT(DISTINCT ib.id)::NUMERIC / COUNT(DISTINCT ib.student_id)::NUMERIC, 2)
            ELSE 0
        END,
        jsonb_object_agg(
            COALESCE(p.specialization, 'Unknown'),
            COUNT(DISTINCT p.id)
        ) FILTER (WHERE p.specialization IS NOT NULL),
        jsonb_object_agg(
            COALESCE(p.graduation_year::TEXT, 'Unknown'),
            COUNT(DISTINCT p.id)
        ) FILTER (WHERE p.graduation_year IS NOT NULL)
    FROM profiles p
    LEFT JOIN interview_bookings ib ON p.id = ib.student_id
    WHERE p.role = 'student';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION fn_generate_event_slots(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_add_event_time_range(UUID, DATE, TIME, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_delete_event_time_range(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_event_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_company_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_student_analytics() TO authenticated;

-- RLS policies for event_time_ranges
ALTER TABLE event_time_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage time ranges" ON event_time_ranges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Public can view time ranges" ON event_time_ranges
    FOR SELECT USING (true);
