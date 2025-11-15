-- Migration: Event Registrations and Offer-Event Linking
-- Created: 2025-11-02
-- Description: Link offers to events and allow companies to register for events

-- 1. Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    CONSTRAINT unique_event_company UNIQUE(event_id, company_id)
);

CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_company ON event_registrations(company_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(status);

COMMENT ON TABLE event_registrations IS 'Companies register to participate in specific events';
COMMENT ON COLUMN event_registrations.status IS 'pending: waiting admin approval, approved: can participate, rejected: not allowed';

-- 2. Add event_id to offers table (nullable for backward compatibility)
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_event ON offers(event_id);

COMMENT ON COLUMN offers.event_id IS 'Event this offer is created for. NULL = general offer (legacy)';

-- 3. Enable RLS on event_registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registrations

-- Companies can view their own registrations
CREATE POLICY "Companies can view their own registrations"
ON event_registrations FOR SELECT
USING (
    company_id IN (
        SELECT id FROM companies WHERE profile_id = auth.uid()
    )
);

-- Companies can create registrations for themselves
CREATE POLICY "Companies can register for events"
ON event_registrations FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT id FROM companies WHERE profile_id = auth.uid()
    )
    AND status = 'pending' -- Can only create pending registrations
);

-- Companies can cancel their pending registrations
CREATE POLICY "Companies can cancel pending registrations"
ON event_registrations FOR DELETE
USING (
    company_id IN (
        SELECT id FROM companies WHERE profile_id = auth.uid()
    )
    AND status = 'pending'
);

-- Admins can view all registrations
CREATE POLICY "Admins can view all registrations"
ON event_registrations FOR SELECT
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admins can approve/reject registrations
CREATE POLICY "Admins can manage registrations"
ON event_registrations FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Everyone can view event registrations (for public event info)
CREATE POLICY "Public can view approved registrations"
ON event_registrations FOR SELECT
USING (status = 'approved');

-- 4. Update fn_generate_event_slots to only include registered companies
DROP FUNCTION IF EXISTS fn_generate_event_slots CASCADE;

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

    -- Delete existing slots for this event
    DELETE FROM event_slots WHERE event_id = p_event_id;

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
                -- Insert slot for this company at this time
                INSERT INTO event_slots (
                    event_id, 
                    company_id, 
                    slot_time, 
                    start_time,
                    end_time,
                    capacity
                )
                VALUES (
                    p_event_id, 
                    v_company.company_id,
                    v_current_slot_time,
                    v_current_slot_time,
                    v_current_slot_time + (v_event.interview_duration_minutes * INTERVAL '1 minute'),
                    v_event.slots_per_time
                );
                
                v_slots_count := v_slots_count + 1;
            END LOOP;
            
            v_current_slot_time := v_current_slot_time + v_slot_interval;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT v_slots_count, v_ranges_count, v_companies_count;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_generate_event_slots(UUID) TO authenticated;

-- 5. Function for companies to register for an event
CREATE OR REPLACE FUNCTION fn_register_for_event(
    p_event_id UUID,
    p_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_registration_id UUID;
BEGIN
    -- Check if company is verified
    IF NOT EXISTS (
        SELECT 1 FROM companies 
        WHERE id = p_company_id 
        AND verification_status = 'verified'
    ) THEN
        RAISE EXCEPTION 'Company must be verified to register for events';
    END IF;

    -- Check if already registered
    IF EXISTS (
        SELECT 1 FROM event_registrations 
        WHERE event_id = p_event_id AND company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'Already registered for this event';
    END IF;

    -- Create registration (status = pending, needs admin approval)
    INSERT INTO event_registrations (event_id, company_id, status)
    VALUES (p_event_id, p_company_id, 'pending')
    RETURNING id INTO v_registration_id;

    RETURN v_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_register_for_event(UUID, UUID) TO authenticated;

-- 6. Function for admins to approve/reject registrations
CREATE OR REPLACE FUNCTION fn_manage_event_registration(
    p_registration_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can manage event registrations';
    END IF;

    -- Validate status
    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Status must be approved or rejected';
    END IF;

    -- Update registration
    UPDATE event_registrations
    SET 
        status = p_status,
        approved_by = auth.uid(),
        approved_at = NOW(),
        notes = COALESCE(p_notes, notes)
    WHERE id = p_registration_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_manage_event_registration(UUID, TEXT, TEXT) TO authenticated;

-- 7. Update event analytics to count registered companies
DROP FUNCTION IF EXISTS fn_get_event_analytics CASCADE;

CREATE OR REPLACE FUNCTION fn_get_event_analytics()
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
    SELECT 
        e.id,
        e.name,
        e.date,
        COUNT(DISTINCT es.id)::INTEGER as total_slots,
        COUNT(DISTINCT ib.id) FILTER (WHERE ib.status = 'confirmed')::INTEGER as booked_slots,
        (COUNT(DISTINCT es.id) - COUNT(DISTINCT ib.id) FILTER (WHERE ib.status = 'confirmed'))::INTEGER as available_slots,
        COUNT(DISTINCT er.company_id) FILTER (WHERE er.status = 'approved')::INTEGER as total_companies,
        COUNT(DISTINCT o.id)::INTEGER as total_offers,
        COUNT(DISTINCT ib.student_id)::INTEGER as total_students,
        CASE 
            WHEN COUNT(DISTINCT es.id) > 0 
            THEN ROUND((COUNT(DISTINCT ib.id) FILTER (WHERE ib.status = 'confirmed')::NUMERIC / COUNT(DISTINCT es.id)::NUMERIC) * 100, 2)
            ELSE 0
        END as booking_rate
    FROM events e
    LEFT JOIN event_slots es ON es.event_id = e.id
    LEFT JOIN interview_bookings ib ON ib.slot_id = es.id
    LEFT JOIN event_registrations er ON er.event_id = e.id
    LEFT JOIN offers o ON o.event_id = e.id AND o.is_active = true
    GROUP BY e.id, e.name, e.date
    ORDER BY e.date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_event_analytics() TO authenticated;
