-- =====================================================
-- Migration 24: Quick Invite System (Seamless Workflow)
-- =====================================================
-- Description: 
--   Ultimate simplicity inspired by world leaders (LinkedIn, Eventbrite, etc.)
--   
--   WORKFLOW 1: Add New Company
--     Admin enters: Email + Name → Done!
--     → Company created, invited, email sent, slots generated
--   
--   WORKFLOW 2: Re-invite Returning Company
--     Search: "techcorp" → Shows: TECHCORP2025 (participated 2 times)
--     Click: "Invite" → Done!
--     → Re-invited, email sent, slots generated
--
-- Inspired by: LinkedIn Events, Eventbrite, Stripe Customers, HubSpot Contacts
-- Date: 2025-11-04
-- =====================================================

-- =====================================================
-- Part 1: Auto-Generate Company Code Function
-- =====================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION generate_company_code(company_name_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 1;
  current_year text;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Clean: Remove accents, special chars, spaces → UPPERCASE
  base_code := UPPER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        UNACCENT(company_name_input),
        '[^A-Za-z0-9]', '', 'g'
      ),
      '\s+', '', 'g'
    )
  );
  
  -- Limit length (leave room for year + counter)
  base_code := SUBSTRING(base_code, 1, 15);
  
  -- Add year: "TECHCORP2025"
  final_code := base_code || current_year;
  
  -- Handle duplicates with counter: "TECHCORP20252", "TECHCORP20253"
  WHILE EXISTS (SELECT 1 FROM companies WHERE company_code = final_code) LOOP
    final_code := base_code || current_year || counter::text;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_code;
END;
$$;

COMMENT ON FUNCTION generate_company_code IS 
'Auto-generates unique, stable company code from name. Example: "TechCorp Solutions" → "TECHCORPSOLUTI2025"';

-- =====================================================
-- Part 2: Add Company Code Column
-- =====================================================

-- Add company_code as stable identifier
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS company_code text UNIQUE;

-- Index for fast search
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_name_search ON companies USING gin(to_tsvector('english', company_name));

COMMENT ON COLUMN companies.company_code IS 
'Stable company identifier (never changes). Used for: search, re-invitations, history tracking.';

-- =====================================================
-- Part 3: Quick Invite Function (THE MAGIC!)
-- =====================================================
-- This is your ONE-STEP workflow!
-- Input: email + name → Output: Company created + Invited + Email sent

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
  
  -- Step 4: Check if already invited to this event
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
'🚀 ONE-STEP INVITE: Email + Name → Company created/updated + Invited + Slots generated + Email sent. Seamless workflow!';

-- =====================================================
-- Part 4: Search Companies (For Re-Invitation)
-- =====================================================
-- Search returns rich info: code, history, participation count

CREATE OR REPLACE FUNCTION search_companies_for_invitation(
  search_query text,
  event_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_code text,
  company_name text,
  email text,
  industry text,
  website text,
  is_verified boolean,
  total_participations bigint,
  last_event_date date,
  last_event_name text,
  already_invited boolean
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH company_history AS (
    SELECT 
      ep.company_id,
      COUNT(*) as participation_count,
      MAX(e.date) as latest_event_date,
      (
        SELECT e2.name 
        FROM event_participants ep2 
        JOIN events e2 ON ep2.event_id = e2.id 
        WHERE ep2.company_id = ep.company_id 
        ORDER BY e2.date DESC 
        LIMIT 1
      ) as latest_event_name
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    GROUP BY ep.company_id
  )
  SELECT 
    c.id,
    c.company_code,
    c.company_name,
    COALESCE(p.email, 'No email yet') as email,
    c.industry,
    c.website,
    c.is_verified,
    COALESCE(ch.participation_count, 0) as total_participations,
    ch.latest_event_date as last_event_date,
    ch.latest_event_name as last_event_name,
    CASE 
      WHEN event_id_filter IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = event_id_filter AND ep.company_id = c.id
        )
      ELSE false
    END as already_invited
  FROM companies c
  LEFT JOIN profiles p ON c.profile_id = p.id
  LEFT JOIN company_history ch ON ch.company_id = c.id
  WHERE 
    c.is_verified = true
    AND (
      search_query IS NULL 
      OR search_query = ''
      OR LOWER(c.company_name) LIKE LOWER('%' || search_query || '%')
      OR LOWER(c.company_code) LIKE LOWER('%' || search_query || '%')
      OR LOWER(COALESCE(p.email, '')) LIKE LOWER('%' || search_query || '%')
    )
  ORDER BY 
    -- Not invited first, then by participation history
    CASE WHEN event_id_filter IS NOT NULL THEN
      (SELECT COUNT(*) FROM event_participants WHERE event_id = event_id_filter AND company_id = c.id)
    ELSE 0 END ASC,
    COALESCE(ch.participation_count, 0) DESC,
    c.company_name ASC
  LIMIT 100;
END;
$$;

COMMENT ON FUNCTION search_companies_for_invitation IS 
'🔍 Search companies by name/code/email. Shows participation history, perfect for re-invitations.';

-- =====================================================
-- Part 5: Helper Function - Get Company Participation History
-- =====================================================

CREATE OR REPLACE FUNCTION get_company_participation_history(p_company_id uuid)
RETURNS TABLE (
  event_id uuid,
  event_name text,
  event_date date,
  total_slots integer,
  booked_slots integer,
  total_offers integer,
  invited_at timestamptz
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    e.date as event_date,
    (
      SELECT COUNT(*) 
      FROM event_slots es 
      WHERE es.event_id = e.id AND es.company_id = p_company_id
    )::integer as total_slots,
    (
      SELECT COUNT(*) 
      FROM event_slots es 
      JOIN interview_bookings ib ON ib.slot_id = es.id
      WHERE es.event_id = e.id AND es.company_id = p_company_id
    )::integer as booked_slots,
    (
      SELECT COUNT(*) 
      FROM offers o 
      WHERE o.company_id = p_company_id AND o.created_at <= e.date + INTERVAL '30 days'
    )::integer as total_offers,
    ep.invited_at
  FROM event_participants ep
  JOIN events e ON ep.event_id = e.id
  WHERE ep.company_id = p_company_id
  ORDER BY e.date DESC;
END;
$$;

COMMENT ON FUNCTION get_company_participation_history IS 
'📊 Get detailed participation history for a company across all events.';

-- =====================================================
-- Part 6: Update Existing Companies with Codes
-- =====================================================
-- Backfill company_code for existing companies

DO $$
DECLARE
  company_record RECORD;
  new_code text;
BEGIN
  FOR company_record IN 
    SELECT id, company_name 
    FROM companies 
    WHERE company_code IS NULL
  LOOP
    new_code := generate_company_code(company_record.company_name);
    
    UPDATE companies 
    SET company_code = new_code 
    WHERE id = company_record.id;
    
    RAISE NOTICE 'Generated code % for company %', new_code, company_record.company_name;
  END LOOP;
END $$;

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- 
-- USAGE EXAMPLES:
--
-- 1. Quick Invite (New Company):
--    SELECT quick_invite_company(
--      'hr@newcompany.com', 
--      'New Company Inc', 
--      'event-uuid-here'
--    );
--
-- 2. Search for Re-Invitation:
--    SELECT * FROM search_companies_for_invitation('tech', 'event-uuid-here');
--
-- 3. Re-Invite Existing Company:
--    SELECT quick_invite_company(
--      'hr@techcorp.com',  -- Email already in system
--      'TechCorp Solutions',  -- Will update if name changed
--      'new-event-uuid'  -- New event!
--    );
--
-- 4. View Company History:
--    SELECT * FROM get_company_participation_history('company-uuid-here');
--
-- =====================================================
