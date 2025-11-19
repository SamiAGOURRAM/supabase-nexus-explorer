-- =====================================================
-- Fix: Quick Invite Duplicate Handling
-- Migration: 20251119000003_fix_quick_invite_duplicates
-- =====================================================
-- This migration fixes the quick_invite_company function to properly
-- handle duplicate companies without throwing errors
-- =====================================================

-- Disable auto slot generation trigger (we want manual control)
DROP TRIGGER IF EXISTS auto_generate_slots_on_company_invite ON event_participants;

-- Drop all possible variations of the function
DROP FUNCTION IF EXISTS quick_invite_company(text, text, uuid);
DROP FUNCTION IF EXISTS quick_invite_company(text, text, uuid, text);
DROP FUNCTION IF EXISTS quick_invite_company(text, text, uuid, text, text);
DROP FUNCTION IF EXISTS quick_invite_company(text, text, uuid, text, text, boolean);

-- Create the single correct version
CREATE OR REPLACE FUNCTION quick_invite_company(
  p_email text,
  p_company_name text,
  p_event_id uuid,
  p_industry text DEFAULT 'Other',
  p_website text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_company_code text;
  v_user_id uuid;
  v_is_new_company boolean := false;
  v_already_invited boolean := false;
  v_event_name text;
  v_auth_user_exists boolean := false;
BEGIN
  -- Validate input
  IF p_email IS NULL OR p_company_name IS NULL OR p_event_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Missing required fields: email, company_name, or event_id'
    );
  END IF;
  
  -- Normalize inputs
  p_email := LOWER(TRIM(p_email));
  p_company_name := TRIM(p_company_name);
  
  -- Step 1: Check if auth.users exists for this email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  v_auth_user_exists := (v_user_id IS NOT NULL);
  
  -- Step 2: Try to find existing company (check profile, email, and code)
  SELECT c.id, c.company_code
  INTO v_company_id, v_company_code
  FROM companies c
  WHERE c.profile_id = v_user_id 
     OR c.email = p_email 
     OR c.company_code = generate_company_code(p_company_name)
  LIMIT 1;
  
  -- Step 3: Create or update company
  IF v_company_id IS NULL THEN
    -- Generate company code
    v_company_code := generate_company_code(p_company_name);
    
    -- Company doesn't exist, create it
    BEGIN
      INSERT INTO companies (
        profile_id,
        company_name,
        company_code,
        industry,
        website,
        email,
        is_verified,
        verification_status,
        created_at
      ) VALUES (
        v_user_id,  -- Will be NULL if user doesn't exist yet
        p_company_name,
        v_company_code,
        COALESCE(p_industry, 'Other'),
        p_website,
        p_email,
        true,
        'verified',
        NOW()
      )
      RETURNING id INTO v_company_id;
      
      v_is_new_company := true;
      RAISE NOTICE '✅ Created company: % (code: %)', p_company_name, v_company_code;
      
    EXCEPTION WHEN unique_violation THEN
      -- Race condition: company was just created, fetch it again
      SELECT c.id, c.company_code
      INTO v_company_id, v_company_code
      FROM companies c
      WHERE c.email = p_email OR c.company_code = v_company_code
      LIMIT 1;
      
      IF v_company_id IS NULL THEN
        -- Still can't find it, return error with helpful message
        RETURN json_build_object(
          'success', false,
          'error', 'Duplicate company detected',
          'message', 'This company already exists but could not be located. Please try using the "Re-invite Existing" tab to search for and invite this company.'
        );
      END IF;
      
      RAISE NOTICE '🔄 Company already exists (race condition), using existing record';
    END;
  END IF;
  
  -- Step 4: Update company info if it already existed
  IF NOT v_is_new_company THEN
    UPDATE companies
    SET 
      company_name = p_company_name,
      industry = COALESCE(p_industry, industry),
      website = COALESCE(p_website, website),
      email = p_email,
      updated_at = NOW()
    WHERE id = v_company_id;
    
    RAISE NOTICE '🔄 Updated existing company: % (code: %)', p_company_name, v_company_code;
  END IF;
  
  -- Step 5: Check if already invited to THIS SPECIFIC EVENT
  v_already_invited := EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_id = p_event_id AND company_id = v_company_id
  );
  
  IF NOT v_already_invited THEN
    -- Step 6: Invite to event (use INSERT ... ON CONFLICT to handle race conditions)
    INSERT INTO event_participants (event_id, company_id, invited_at)
    VALUES (p_event_id, v_company_id, NOW())
    ON CONFLICT (event_id, company_id) DO NOTHING;
    
    -- Get event name
    SELECT name INTO v_event_name FROM events WHERE id = p_event_id;
    
    RAISE NOTICE '📧 Invited % to event: %', p_company_name, v_event_name;
  END IF;
  
  -- Step 7: Return comprehensive result
  RETURN json_build_object(
    'success', true,
    'company_id', v_company_id,
    'company_code', v_company_code,
    'company_name', p_company_name,
    'email', p_email,
    'is_new_company', v_is_new_company,
    'auth_user_exists', v_auth_user_exists,
    'already_invited', v_already_invited,
    'slots_generated', false,
    'action', CASE 
      WHEN v_is_new_company AND NOT v_already_invited THEN 'created_and_invited'
      WHEN v_is_new_company AND v_already_invited THEN 'created_but_already_invited'
      WHEN NOT v_is_new_company AND NOT v_already_invited THEN 'reinvited'
      ELSE 'already_invited'
    END,
    'message', CASE 
      WHEN v_is_new_company AND NOT v_already_invited THEN 
        '✅ Company created and invited! NO SLOTS generated (create slots manually via Sessions/Offers).'
      WHEN v_is_new_company AND v_already_invited THEN 
        '⚠️ Company created but already invited to this event'
      WHEN NOT v_is_new_company AND NOT v_already_invited THEN 
        '🎉 Company re-invited! NO SLOTS generated (create slots manually via Sessions/Offers).'
      ELSE 
        'ℹ️ Company already invited to this event'
    END,
    'next_step', CASE
      WHEN NOT v_auth_user_exists THEN 'send_invite_email'
      ELSE 'send_notification_email'
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Handle any other unexpected errors
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', '❌ Unexpected error: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION quick_invite_company(text, text, uuid, text, text) IS 
  'ONE-STEP invite: Creates company (if new) + Invites to event. NO AUTO-SLOT GENERATION. Handles duplicates gracefully by updating existing companies.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
