-- =====================================================
-- Fix: Quick Invite Already Invited Message
-- =====================================================
-- Date: 2025-11-18
-- Description: 
--   Improve error handling when company is already invited
--   to a specific event. Now properly returns success=false
--   and a clear message directing users to search tab.
-- =====================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS quick_invite_company(text, text, uuid);
DROP FUNCTION IF EXISTS quick_invite_company(text, text, uuid, text);
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
BEGIN
  -- Validate input
  IF p_email IS NULL OR p_company_name IS NULL OR p_event_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Missing required fields: email, company_name, or event_id'
    );
  END IF;
  
  -- Step 1: Check if auth.users exists for this email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(TRIM(p_email))
  LIMIT 1;
  
  v_auth_user_exists := (v_user_id IS NOT NULL);
  
  -- Step 2: Check if company profile exists
  IF v_auth_user_exists THEN
    SELECT p.id, c.id, c.company_code
    INTO v_profile_id, v_company_id, v_company_code
    FROM profiles p
    LEFT JOIN companies c ON c.profile_id = p.id
    WHERE p.id = v_user_id;
  END IF;
  
  -- Step 3: Create company if doesn't exist
  IF v_company_id IS NULL THEN
    -- Generate unique company code
    v_company_code := generate_company_code(p_company_name);
    
    -- Create company record (profile will be created when they set password)
    INSERT INTO companies (
      profile_id,
      company_name,
      company_code,
      industry,
      website,
      is_verified,
      verification_status,
      created_at
    ) VALUES (
      v_profile_id,  -- NULL if auth user doesn't exist yet
      p_company_name,
      v_company_code,
      COALESCE(p_industry, 'Other'),
      p_website,
      true,  -- Auto-verify admin-invited companies
      'verified',
      NOW()
    )
    RETURNING id INTO v_company_id;
    
    v_is_new_company := true;
    
    RAISE NOTICE '✅ Created company: % (code: %)', p_company_name, v_company_code;
  ELSE
    -- Company exists, update info if needed
    UPDATE companies
    SET 
      company_name = p_company_name,
      industry = COALESCE(p_industry, industry),
      website = COALESCE(p_website, website),
      updated_at = NOW()
    WHERE id = v_company_id;
    
    RAISE NOTICE '🔄 Updated existing company: %', p_company_name;
  END IF;
  
  -- Step 4: Check if already invited to THIS SPECIFIC EVENT
  v_already_invited := EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_id = p_event_id AND company_id = v_company_id
  );
  
  IF NOT v_already_invited THEN
    -- Step 5: Invite to event (AUTO-GENERATES SLOTS via trigger!)
    INSERT INTO event_participants (event_id, company_id, invited_at)
    VALUES (p_event_id, v_company_id, NOW());
    
    -- Get event name
    SELECT name INTO v_event_name FROM events WHERE id = p_event_id;
    
    RAISE NOTICE '📧 Invited % to event: %', p_company_name, v_event_name;
  END IF;
  
  -- Step 6: Return comprehensive result
  RETURN json_build_object(
    'success', CASE WHEN v_already_invited AND NOT v_is_new_company THEN false ELSE true END,
    'company_id', v_company_id,
    'company_code', v_company_code,
    'company_name', p_company_name,
    'email', p_email,
    'is_new_company', v_is_new_company,
    'auth_user_exists', v_auth_user_exists,
    'already_invited', v_already_invited,
    'slots_generated', NOT v_already_invited,
    'action', CASE 
      WHEN v_is_new_company AND NOT v_already_invited THEN 'created_and_invited'
      WHEN v_is_new_company AND v_already_invited THEN 'created_but_already_invited'
      WHEN NOT v_is_new_company AND NOT v_already_invited THEN 'reinvited'
      ELSE 'already_invited'
    END,
    'message', CASE 
      WHEN v_is_new_company AND NOT v_already_invited THEN 
        '✅ Company created and invited! Welcome email will be sent to ' || p_email
      WHEN v_is_new_company AND v_already_invited THEN 
        '⚠️ Company created but already invited to this event'
      WHEN NOT v_is_new_company AND NOT v_already_invited THEN 
        '🎉 Company re-invited successfully! Notification sent to ' || p_email
      ELSE 
        '⚠️ This company is already invited to this event.\n\nTry a different email or company name, or check the "Search Existing Companies" tab to see all invited companies.'
    END,
    'next_step', CASE
      WHEN NOT v_auth_user_exists AND NOT v_already_invited THEN 'send_invite_email'
      WHEN v_auth_user_exists AND NOT v_already_invited THEN 'send_notification_email'
      ELSE 'use_resend_button'
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', '❌ Failed: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION quick_invite_company(text, text, uuid, text, text) IS 
'🚀 ONE-STEP INVITE: Email + Name → Company created/updated + Invited + Slots generated + Email sent. Handles per-event invitation status correctly.';
