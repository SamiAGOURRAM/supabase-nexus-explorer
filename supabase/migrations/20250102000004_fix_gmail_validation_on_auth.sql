-- =====================================================
-- FIX: Update validate_student_email_on_auth to allow Gmail
-- Migration: 20250102000004_fix_gmail_validation_on_auth
-- =====================================================
-- This migration updates the auth.users trigger function
-- to allow both @um6p.ma and @gmail.com domains for testing
-- =====================================================

-- Update the validate_student_email_on_auth function to allow Gmail
CREATE OR REPLACE FUNCTION public.validate_student_email_on_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';
  v_email := LOWER(TRIM(NEW.email));
  
  IF v_role = 'student' THEN
    -- Allow both @um6p.ma and @gmail.com domains
    IF v_email !~* '@um6p\.ma$' AND v_email !~* '@gmail\.com$' THEN
      RAISE EXCEPTION 'Student email must be from UM6P domain (@um6p.ma) or Gmail (@gmail.com) for testing'
        USING 
          ERRCODE = 'check_violation',
          HINT = 'Please use your UM6P university email address or Gmail for testing';
    END IF;
    
    -- Optional: Log non-whitelisted signups for admin review (only for UM6P emails)
    BEGIN
      IF v_email ~* '@um6p\.ma$' AND NOT is_email_allowed(v_email) THEN
        INSERT INTO notifications (user_id, title, message, type)
        SELECT 
          id, 
          'New Student Signup - Review Required',
          'Student ' || v_email || ' signed up but is not in approved whitelist',
          'admin_review'
        FROM profiles 
        WHERE role = 'admin'
        LIMIT 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Documentation
COMMENT ON FUNCTION public.validate_student_email_on_auth() IS 
  'Validates @um6p.ma or @gmail.com domain BEFORE creating auth user. Updated to allow Gmail for testing.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Updated validate_student_email_on_auth() to allow @gmail.com
-- 
-- Note: Gmail accounts are now allowed for testing at the auth.users level.
-- =====================================================

