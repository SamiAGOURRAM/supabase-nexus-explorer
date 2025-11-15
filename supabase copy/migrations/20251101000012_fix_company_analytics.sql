-- Migration: Fix Company Analytics to include verification_status
-- Created: 2025-11-01
-- Description: Update fn_get_company_analytics to return verification_status and sync existing data

-- First, synchronize existing company data to ensure consistency
-- Set verification_status based on is_verified for companies that may be out of sync
UPDATE companies
SET verification_status = CASE 
    WHEN is_verified = true THEN 'verified'::company_verification_status
    WHEN is_verified = false AND verified_by IS NULL THEN 'pending'::company_verification_status
    ELSE verification_status
END
WHERE verification_status != CASE 
    WHEN is_verified = true THEN 'verified'::company_verification_status
    WHEN is_verified = false AND verified_by IS NULL THEN 'pending'::company_verification_status
    ELSE verification_status
END;

-- Drop and recreate the analytics function
DROP FUNCTION IF EXISTS fn_get_company_analytics() CASCADE;

CREATE OR REPLACE FUNCTION fn_get_company_analytics()
RETURNS TABLE (
    company_id UUID,
    company_name TEXT,
    total_offers INTEGER,
    active_offers INTEGER,
    total_bookings INTEGER,
    confirmed_bookings INTEGER,
    unique_students INTEGER,
    is_verified BOOLEAN,
    verification_status TEXT
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
        c.is_verified,
        c.verification_status::TEXT
    FROM companies c
    LEFT JOIN offers o ON c.id = o.company_id
    LEFT JOIN interview_bookings ib ON o.id = ib.offer_id
    GROUP BY c.id, c.company_name, c.is_verified, c.verification_status
    ORDER BY total_bookings DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION fn_get_company_analytics() TO authenticated;

-- Add comment
COMMENT ON FUNCTION fn_get_company_analytics IS 'Get analytics for all companies including verification status';
