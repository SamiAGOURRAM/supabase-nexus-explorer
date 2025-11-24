-- =====================================================
-- Allow Gmail for Testing - Update Email Validation
-- Migration: 20251118093033_allow_gmail_for_testing
-- =====================================================
-- This migration updates email validation to allow both
-- @um6p.ma and @gmail.com domains for testing purposes
-- =====================================================

-- Update the validate_student_email function to allow Gmail
CREATE OR REPLACE FUNCTION validate_student_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.role = 'student' THEN
        -- Allow both @um6p.ma and @gmail.com domains
        IF NEW.email !~* '@um6p\.ma$' AND NEW.email !~* '@gmail\.com$' THEN
            RAISE EXCEPTION 'Student email must be from UM6P domain (@um6p.ma) or Gmail (@gmail.com) for testing';
        END IF;
        
        -- Optional: Log non-whitelisted signups for admin review (only for UM6P emails)
        IF NEW.email ~* '@um6p\.ma$' AND NOT is_email_allowed(NEW.email) THEN
            -- Insert notification for admin to review
            INSERT INTO notifications (user_id, title, message, type)
            SELECT id, 
                   'New Student Signup - Review Required',
                   'Student ' || NEW.email || ' signed up but is not in the whitelist',
                   'admin_review'
            FROM profiles 
            WHERE role = 'admin'
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update the allowed_student_emails table constraint to allow Gmail
ALTER TABLE allowed_student_emails 
DROP CONSTRAINT IF EXISTS allowed_student_emails_email_check;

ALTER TABLE allowed_student_emails 
ADD CONSTRAINT allowed_student_emails_email_check 
CHECK (email ~* '@um6p\.ma$' OR email ~* '@gmail\.com$');

-- Update the is_email_allowed function to handle Gmail
CREATE OR REPLACE FUNCTION is_email_allowed(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Gmail emails are always allowed for testing
    IF email_to_check ~* '@gmail\.com$' THEN
        RETURN true;
    END IF;
    
    -- UM6P emails must be in the whitelist
    IF email_to_check !~* '@um6p\.ma$' THEN
        RETURN false;
    END IF;
    
    -- Check whitelist for UM6P emails
    RETURN EXISTS (
        SELECT 1 
        FROM allowed_student_emails 
        WHERE LOWER(email) = LOWER(email_to_check)
    );
END;
$$;

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Updated validate_student_email() to allow @gmail.com
-- ✅ Updated allowed_student_emails table constraint
-- ✅ Updated is_email_allowed() to allow Gmail by default
-- 
-- Note: Gmail accounts are allowed for official testing.
-- UM6P emails still require whitelist approval.
-- =====================================================
