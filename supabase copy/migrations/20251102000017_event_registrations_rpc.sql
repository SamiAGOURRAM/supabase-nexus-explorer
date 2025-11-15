-- Migration: RPC Functions for Event Registrations
-- Created: 2025-11-02
-- Description: Functions to fetch event registrations with company details (avoids Supabase aliasing issues)

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS fn_get_event_registrations(UUID);
DROP FUNCTION IF EXISTS fn_get_company_registrations(UUID);

-- Function to get event registrations with full company details
CREATE OR REPLACE FUNCTION fn_get_event_registrations(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    status TEXT,
    registered_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    notes TEXT,
    company_id UUID,
    company_name TEXT,
    company_industry TEXT,
    company_verification_status company_verification_status,
    contact_email TEXT,
    contact_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.id,
        er.status,
        er.registered_at,
        er.approved_at,
        er.approved_by,
        er.notes,
        c.id as company_id,
        c.company_name as company_name,
        c.industry as company_industry,
        c.verification_status as company_verification_status,
        p.email as contact_email,
        p.full_name as contact_name
    FROM event_registrations er
    INNER JOIN companies c ON c.id = er.company_id
    INNER JOIN profiles p ON p.id = c.profile_id
    WHERE er.event_id = p_event_id
    ORDER BY er.registered_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_event_registrations(UUID) TO authenticated;

COMMENT ON FUNCTION fn_get_event_registrations(UUID) IS 
    'Returns all registrations for an event with full company and contact details';

-- Function to get company registrations (for company dashboard)
CREATE OR REPLACE FUNCTION fn_get_company_registrations(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    status TEXT,
    registered_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    event_id UUID,
    event_name TEXT,
    event_date TIMESTAMPTZ,
    event_location TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.id,
        er.status,
        er.registered_at,
        er.approved_at,
        er.notes,
        e.id as event_id,
        e.name as event_name,
        e.date as event_date,
        e.location as event_location
    FROM event_registrations er
    INNER JOIN events e ON e.id = er.event_id
    WHERE er.company_id = p_company_id
    ORDER BY er.registered_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_company_registrations(UUID) TO authenticated;

COMMENT ON FUNCTION fn_get_company_registrations(UUID) IS 
    'Returns all event registrations for a specific company';
