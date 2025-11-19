-- =====================================================
-- FIX: Move Email Validation to auth.users Table
-- Applied by: mohammedelmahf
-- Date: 2025-11-15 12:09:22 UTC
-- =====================================================

-- Step 1: Drop the old incorrect trigger on profiles table
DROP TRIGGER IF EXISTS check_student_email_before_insert ON profiles;

-- Step 2: Create new validation function for auth.users
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
    IF v_email !~* '@um6p\.ma$' THEN
      RAISE EXCEPTION 'Student email must be from UM6P domain (@um6p.ma)'
        USING 
          ERRCODE = 'check_violation',
          HINT = 'Please use your UM6P university email address';
    END IF;
    
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
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger on auth.users (BEFORE INSERT)
DROP TRIGGER IF EXISTS validate_student_email_before_signup ON auth.users;

CREATE TRIGGER validate_student_email_before_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_student_email_on_auth();

-- Documentation
COMMENT ON FUNCTION public.validate_student_email_on_auth() IS 
  'Validates @um6p.ma domain BEFORE creating auth user. Applied 2025-11-15 12:09:22 UTC by mohammedelmahf';

COMMENT ON TRIGGER validate_student_email_before_signup ON auth.users IS 
  'Blocks student signups with non-UM6P email addresses before auth user creation';