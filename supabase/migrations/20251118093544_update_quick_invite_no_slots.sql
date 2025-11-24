-- =====================================================
-- Update Quick Invite - Don't Auto-Generate Slots
-- Migration: 20251118093544_update_quick_invite_no_slots
-- =====================================================
-- This migration ensures that when a company is invited
-- via quick invite, NO slots are automatically generated.
-- Admin must manually create slots via sessions/offers.
-- =====================================================

-- Update the quick_invite_company function return message
-- to clarify that NO slots are auto-generated
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
      LOWER(TRIM(p_email)),  -- Store email on company record
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
      email = COALESCE(LOWER(TRIM(p_email)), email),
      updated_at = NOW()
    WHERE id = v_company_id;
    
    RAISE NOTICE '🔄 Updated existing company: %', p_company_name;
  END IF;
  
  -- Step 4: Check if already invited to this event
  v_already_invited := EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_id = p_event_id AND company_id = v_company_id
  );
  
  IF NOT v_already_invited THEN
    -- Step 5: Invite to event (NO AUTO-SLOT GENERATION)
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
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', '❌ Failed: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION quick_invite_company IS 
  'ONE-STEP invite: Creates company (if new) + Invites to event. NO AUTO-SLOT GENERATION. Admin must manually create slots via Sessions/Offers.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Updated quick_invite_company() to NOT auto-generate slots
-- ✅ Updated return message to clarify manual slot creation needed
-- ✅ Added email field to company record during creation
-- 
-- Note: Admin must manually create slots for companies via:
-- 1. Speed Recruiting Sessions (recommended)
-- 2. Or via Offers page
-- =====================================================
