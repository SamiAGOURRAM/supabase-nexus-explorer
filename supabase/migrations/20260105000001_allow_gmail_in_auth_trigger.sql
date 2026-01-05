-- =====================================================
-- Fix: Allow Gmail in Auth Validation Trigger
-- Migration: 20260105000001_allow_gmail_in_auth_trigger
-- =====================================================
-- This migration updates the auth.users trigger function
-- to allow @gmail.com alongside @um6p.ma for testing
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
    -- Allow both @um6p.ma and @gmail.com domains (gmail for testing)
    IF v_email !~* '@um6p\.ma$' AND v_email !~* '@gmail\.com$' THEN
      RAISE EXCEPTION 'Student email must be from UM6P domain (@um6p.ma) or Gmail (@gmail.com) for testing'
        USING 
          ERRCODE = 'check_violation',
          HINT = 'Please use your UM6P university email address or Gmail for testing';
    END IF;
    
    -- Only check whitelist for UM6P emails
    IF v_email ~* '@um6p\.ma$' THEN
      BEGIN
        IF NOT is_email_allowed(v_email) THEN
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Documentation
COMMENT ON FUNCTION public.validate_student_email_on_auth() IS 
  'Validates @um6p.ma or @gmail.com domain BEFORE creating auth user. Updated 2026-01-05 to allow Gmail for testing.';
