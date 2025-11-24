-- =====================================================
-- Fix: Duplicate Company Detection
-- Migration: 20251119000001_fix_duplicate_company_detection
-- =====================================================
-- This migration fixes the quick_invite_company function to properly
-- detect duplicate companies by email, name, or code BEFORE attempting
-- to insert, providing clear error messages to users.
-- =====================================================

DROP FUNCTION IF EXISTS quick_invite_company(text, text, uuid, text, text);

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
  v_profile_id uuid;
  v_user_id uuid;
  v_is_new_company boolean := false;
  v_already_invited boolean := false;
  v_event_name text;
  v_auth_user_exists boolean := false;
  v_existing_company_by_email uuid;
  v_existing_company_by_code uuid;
  v_temp_code text;
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
  
  -- Step 2: Check if company profile exists by auth user
  IF v_auth_user_exists THEN
    SELECT p.id, c.id, c.company_code
    INTO v_profile_id, v_company_id, v_company_code
    FROM profiles p
    LEFT JOIN companies c ON c.profile_id = p.id
    WHERE p.id = v_user_id
    LIMIT 1;
  END IF;
  
  -- Step 3: If no company found by profile, check for duplicates by email or code
  IF v_company_id IS NULL THEN
    -- Generate what the company code would be
    v_temp_code := generate_company_code(p_company_name);
    
    -- Check if a company with this email already exists (in email column)
    SELECT id INTO v_existing_company_by_email
    FROM companies
    WHERE email = p_email
    LIMIT 1;
    
    -- Check if a company with this code already exists
    SELECT id INTO v_existing_company_by_code
    FROM companies
    WHERE company_code = v_temp_code
    LIMIT 1;
    
    -- If duplicates found, determine what to do
    IF v_existing_company_by_email IS NOT NULL OR v_existing_company_by_code IS NOT NULL THEN
      -- Use the existing company
      v_company_id := COALESCE(v_existing_company_by_email, v_existing_company_by_code);
      
      SELECT company_code INTO v_company_code
      FROM companies
      WHERE id = v_company_id;
      
      -- Update the existing company
      UPDATE companies
      SET 
        company_name = p_company_name,
        industry = COALESCE(p_industry, industry),
        website = COALESCE(p_website, website),
        email = p_email,  -- Update email if it was missing
        updated_at = NOW()
      WHERE id = v_company_id;
      
      RAISE NOTICE '🔄 Found and updated existing company: % (code: %)', p_company_name, v_company_code;
    ELSE
      -- No duplicates, safe to create new company
      v_company_code := v_temp_code;
      
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
        v_profile_id,  -- NULL if auth user doesn't exist yet
        p_company_name,
        v_company_code,
        COALESCE(p_industry, 'Other'),
        p_website,
        p_email,
        true,  -- Auto-verify admin-invited companies
        'verified',
        NOW()
      )
      RETURNING id INTO v_company_id;
      
      v_is_new_company := true;
      
      RAISE NOTICE '✅ Created company: % (code: %)', p_company_name, v_company_code;
    END IF;
  END IF;
  
  -- Step 4: Check if already invited to THIS SPECIFIC EVENT
  v_already_invited := EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_id = p_event_id AND company_id = v_company_id
  );
  
  IF NOT v_already_invited THEN
    -- Step 5: Invite to event
    INSERT INTO event_participants (event_id, company_id, invited_at)
    VALUES (p_event_id, v_company_id, NOW());
    
    -- Get event name
    SELECT name INTO v_event_name FROM events WHERE id = p_event_id;
    
    RAISE NOTICE '📧 Invited % to event: %', p_company_name, v_event_name;
  END IF;
  
  -- Step 6: Return comprehensive result
  RETURN json_build_object(
    'success', true,
    'company_id', v_company_id,
    'company_code', v_company_code,
    'company_name', p_company_name,
    'email', p_email,
    'is_new_company', v_is_new_company,
    'auth_user_exists', v_auth_user_exists,
    'already_invited', v_already_invited,
    'slots_generated', false,  -- Never auto-generate slots
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
  WHEN unique_violation THEN
    -- Handle any remaining unique constraint violations
    RETURN json_build_object(
      'success', false,
      'error', 'Duplicate company detected',
      'message', 'A company with this email, name, or code already exists. Please use a different email or company name, or search for the existing company in the "Re-invite Existing" tab.',
      'code', 'DUPLICATE_COMPANY'
    );
  WHEN OTHERS THEN
    -- Handle all other errors
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', '❌ Failed: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION quick_invite_company(text, text, uuid, text, text) IS 
  'ONE-STEP invite: Creates company (if new) + Invites to event. NO AUTO-SLOT GENERATION. Handles duplicates gracefully by updating existing companies.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Fixed duplicate detection to check BEFORE inserting
-- ✅ Added proper handling for companies with same email/name/code
-- ✅ When duplicates found, updates existing company instead of failing
-- ✅ Provides clear error messages for any remaining constraint violations
-- =====================================================
