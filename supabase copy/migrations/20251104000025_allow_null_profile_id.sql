-- =====================================================
-- Migration 25: Allow NULL profile_id for Quick Invite
-- =====================================================
-- Description: 
--   Allow companies.profile_id to be NULL temporarily.
--   This enables the Quick Invite workflow where:
--   1. Admin invites company (profile doesn't exist yet)
--   2. Company receives email invitation
--   3. Company sets password → profile created
--   4. Trigger links profile to company
--
-- Date: 2025-11-04
-- =====================================================

-- Step 1: Allow NULL profile_id in companies table
ALTER TABLE companies 
ALTER COLUMN profile_id DROP NOT NULL;

COMMENT ON COLUMN companies.profile_id IS 
'User profile ID. Can be NULL for invited companies that haven''t registered yet. Will be populated when user sets password.';

-- Step 1.5: Drop the problematic check constraint that requires verified companies to have all fields
ALTER TABLE companies 
DROP CONSTRAINT IF EXISTS verified_fields_consistent;

-- Recreate a more flexible constraint that allows invited companies (profile_id NULL) to be verified
ALTER TABLE companies
ADD CONSTRAINT verified_fields_consistent CHECK (
  -- If NOT verified, no constraints
  (NOT is_verified) OR
  -- If verified AND has profile (registered user), require all fields
  (is_verified AND profile_id IS NOT NULL AND company_name IS NOT NULL AND industry IS NOT NULL) OR
  -- If verified BUT no profile yet (invited company), only require company_name
  (is_verified AND profile_id IS NULL AND company_name IS NOT NULL)
);

COMMENT ON CONSTRAINT verified_fields_consistent ON companies IS 
'Ensures verified companies have required fields. Allows invited companies (profile_id NULL) to be verified with just company_name.';

-- Step 2: Create trigger to auto-link profile when user signs up
CREATE OR REPLACE FUNCTION link_profile_to_invited_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_user_email text;
BEGIN
  -- Get the user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Check if there's a company waiting for this email
  -- (company with NULL profile_id and matching email in auth.users)
  SELECT c.id INTO v_company_id
  FROM companies c
  WHERE c.profile_id IS NULL
    AND EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.email = v_user_email
      LIMIT 1
    )
  LIMIT 1;

  -- If found, link the profile to the company
  IF v_company_id IS NOT NULL THEN
    UPDATE companies
    SET profile_id = NEW.id,
        updated_at = NOW()
    WHERE id = v_company_id;
    
    RAISE NOTICE '✅ Linked profile % to company %', NEW.id, v_company_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_link_profile_to_company ON profiles;

CREATE TRIGGER trigger_link_profile_to_company
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_profile_to_invited_company();

COMMENT ON FUNCTION link_profile_to_invited_company IS 
'Auto-links newly created profile to invited company (if exists). Runs when user sets password after Quick Invite.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- 
-- WORKFLOW:
-- 1. Admin invites: quick_invite_company('new@company.com', 'New Corp', event_id)
--    → Company created with profile_id = NULL
-- 2. User receives email, clicks magic link, sets password
--    → auth.users created
--    → profiles created (via existing trigger)
--    → THIS NEW TRIGGER links profile to waiting company
-- 3. Company can now login and see their event!
--
-- =====================================================
