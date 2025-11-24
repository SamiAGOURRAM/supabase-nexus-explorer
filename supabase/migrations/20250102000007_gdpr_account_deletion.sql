-- =====================================================
-- GDPR Account Deletion Function
-- Migration: 20250102000007_gdpr_account_deletion
-- =====================================================
-- This migration creates a function to safely delete user accounts
-- in compliance with GDPR "Right to be Forgotten"
-- =====================================================

-- Function to delete a user account and all related data
-- This function ensures GDPR compliance by deleting all user data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_company_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to delete account';
    END IF;
    
    -- Get user role to determine what to delete
    SELECT role::text INTO v_role
    FROM public.profiles
    WHERE id = v_user_id;
    
    -- Prevent admins from deleting their account through this function
    -- (Admins should use admin tools)
    IF v_role = 'admin' THEN
        RAISE EXCEPTION 'Admin accounts cannot be deleted through this function. Please contact system administrator.';
    END IF;
    
    -- Delete user's data in proper order to avoid constraint violations
    
    -- 1. Delete bookings (references profiles via student_id)
    DELETE FROM bookings WHERE student_id = v_user_id;
    
    -- 2. Delete booking attempts (references profiles via student_id)
    DELETE FROM booking_attempts WHERE student_id = v_user_id;
    
    -- 3. Delete notifications (references profiles via user_id)
    DELETE FROM notifications WHERE user_id = v_user_id;
    
    -- 4. If company, delete company-specific data first
    IF v_role = 'company' THEN
      -- Get company ID before deleting profile
      SELECT id INTO v_company_id
      FROM companies
      WHERE profile_id = v_user_id;
      
      IF v_company_id IS NOT NULL THEN
        -- Delete company representatives (cascades from company)
        DELETE FROM company_representatives WHERE company_id = v_company_id;
        
        -- Delete event slots for this company (will cascade bookings)
        -- Note: This is handled by CASCADE, but we're being explicit
        DELETE FROM event_slots WHERE company_id = v_company_id;
        
        -- Delete offers for this company
        DELETE FROM offers WHERE company_id = v_company_id;
        
        -- Delete company record (will be handled by CASCADE from profile, but explicit is safer)
        DELETE FROM companies WHERE id = v_company_id;
      END IF;
    END IF;
    
    -- 5. Finally, delete user's profile (this will cascade to any remaining references)
    DELETE FROM profiles WHERE id = v_user_id;
    
    -- Note: The actual auth.users deletion must be done via Supabase Admin API
    -- or through the Supabase client's admin functions
    -- This function handles the public schema cleanup
    
    RAISE NOTICE 'User account data deleted successfully. Auth user deletion should be handled via Supabase Admin API.';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Create a helper function to check if user can delete their account
CREATE OR REPLACE FUNCTION public.can_delete_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    SELECT role::text INTO v_role
    FROM public.profiles
    WHERE id = v_user_id;
    
    -- Only students and companies can delete their accounts
    RETURN v_role IN ('student', 'company');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_delete_account() TO authenticated;

-- =====================================================
-- RLS Policies for Account Deletion
-- =====================================================

-- Allow users to delete their own profile
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- Allow company owners to delete their own company
DROP POLICY IF EXISTS "Company owners can delete their company" ON public.companies;
CREATE POLICY "Company owners can delete their company"
  ON public.companies FOR DELETE
  USING (profile_id = auth.uid());

-- Allow users to delete their own bookings
DROP POLICY IF EXISTS "Students can delete own bookings" ON public.bookings;
CREATE POLICY "Students can delete own bookings"
  ON public.bookings FOR DELETE
  USING (student_id = auth.uid());

-- Allow users to delete their own booking attempts (uses student_id, not user_id)
DROP POLICY IF EXISTS "Users can delete own booking attempts" ON public.booking_attempts;
CREATE POLICY "Users can delete own booking attempts"
  ON public.booking_attempts FOR DELETE
  USING (student_id = auth.uid());

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- Documentation
COMMENT ON FUNCTION public.delete_user_account() IS 
  'GDPR-compliant account deletion. Deletes all user data from public schema. Auth user deletion must be done via Supabase Admin API.';

COMMENT ON FUNCTION public.can_delete_account() IS 
  'Checks if the current user can delete their account (students and companies only).';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Created delete_user_account() function for GDPR compliance
-- ✅ Created can_delete_account() helper function
-- ✅ Only students and companies can delete their accounts
-- ✅ All related data will be deleted via CASCADE
-- =====================================================

