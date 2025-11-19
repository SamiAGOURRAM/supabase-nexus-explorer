-- =====================================================
-- Migration: Fix Company Verification Constraint and Bookings Query
-- =====================================================
-- Description: 
--   1. Fix the verified_fields_consistent constraint to allow verification
--      without requiring verified_by and verified_at for invited companies
--   2. Update fn_verify_company to handle invited companies properly
--   3. Ensure bookings relationship is properly accessible
--
-- Date: 2025-01-17
-- =====================================================

-- Step 1: Drop and recreate the constraint to be more flexible
ALTER TABLE companies 
DROP CONSTRAINT IF EXISTS verified_fields_consistent;

-- New constraint: Allow verification without verified_by/verified_at for invited companies
-- For companies with profile_id (registered), we can optionally track who verified them
-- For companies without profile_id (invited), we only require company_name
ALTER TABLE companies
ADD CONSTRAINT verified_fields_consistent CHECK (
  -- If NOT verified, no constraints on verified_by/verified_at
  (NOT is_verified) OR
  -- If verified, require company_name (always required)
  (is_verified AND company_name IS NOT NULL)
);

COMMENT ON CONSTRAINT verified_fields_consistent ON companies IS 
'Ensures verified companies have company_name. verified_by and verified_at are optional and can be NULL for invited companies.';

-- Step 2: Update fn_verify_company to handle invited companies
CREATE OR REPLACE FUNCTION fn_verify_company(
  p_company_id UUID,
  p_is_verified BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_profile BOOLEAN;
BEGIN
  -- Only admins can verify companies
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can verify companies';
  END IF;

  -- Check if company has a profile (registered user) or is invited (no profile yet)
  SELECT (profile_id IS NOT NULL) INTO v_has_profile
  FROM companies
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  -- Update company verification status
  -- For registered companies (with profile), set verified_by and verified_at
  -- For invited companies (no profile), leave them NULL
  UPDATE companies
  SET 
    is_verified = p_is_verified,
    verification_status = CASE 
      WHEN p_is_verified THEN 'verified'::company_verification_status
      ELSE 'rejected'::company_verification_status
    END,
    verified_by = CASE 
      WHEN p_is_verified AND v_has_profile THEN auth.uid() 
      ELSE NULL 
    END,
    verified_at = CASE 
      WHEN p_is_verified AND v_has_profile THEN NOW() 
      ELSE NULL 
    END,
    updated_at = NOW()
  WHERE id = p_company_id;

END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fn_verify_company(UUID, BOOLEAN) TO authenticated;

-- Add comment
COMMENT ON FUNCTION fn_verify_company(UUID, BOOLEAN) IS 
'Allows admins to verify or reject company registrations. Handles both registered companies (with profile) and invited companies (without profile).';

-- Step 3: Ensure bookings relationship is accessible
-- The bookings table already has a foreign key to event_slots, so the relationship
-- should be automatically available. However, we need to make sure RLS policies
-- allow admins to query bookings through event_slots.

-- Check if there's an RLS policy that might be blocking the query
-- Admins should be able to see all bookings for event management
DO $$
BEGIN
  -- Create a policy for admins to view bookings through event_slots if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Admins can view all bookings'
  ) THEN
    CREATE POLICY "Admins can view all bookings"
    ON bookings FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;

