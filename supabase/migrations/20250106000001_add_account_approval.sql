-- =====================================================
-- Add Account Approval Field for Students
-- =====================================================

-- Add account_approved field to profiles table
ALTER TABLE profiles
ADD COLUMN account_approved BOOLEAN NOT NULL DEFAULT true;

-- Set existing students to approved (legacy accounts)
UPDATE profiles
SET account_approved = true
WHERE role = 'student';

-- Set new students to pending by default (will be overridden by signup trigger)
-- Admin and company accounts are always approved
ALTER TABLE profiles
ALTER COLUMN account_approved SET DEFAULT true;

-- Create trigger to set account_approved to false for new student signups
CREATE OR REPLACE FUNCTION set_student_pending_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new profile is a student, set account_approved to false
  IF NEW.role = 'student' THEN
    NEW.account_approved := false;
  ELSE
    -- For admin and company, always approved
    NEW.account_approved := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert on profiles
DROP TRIGGER IF EXISTS trigger_student_pending_approval ON profiles;
CREATE TRIGGER trigger_student_pending_approval
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_student_pending_approval();

-- Add index for faster queries on account_approved
CREATE INDEX IF NOT EXISTS idx_profiles_account_approved ON profiles(account_approved) WHERE role = 'student';

-- Add comment for documentation
COMMENT ON COLUMN profiles.account_approved IS 'Whether the account has been approved by an admin. New students require admin approval before they can login.';
