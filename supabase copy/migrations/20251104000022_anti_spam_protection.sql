-- Migration 22: Anti-Spam Protection & Company Verification
-- Created: 2025-11-04
-- Purpose: Protect against spam registrations and enforce verification workflow

-- ============================================
-- PART 1: RLS Policies for Company Visibility
-- ============================================

-- Companies should ONLY be visible to:
-- 1. Admins (see all)
-- 2. The company itself (see own profile)
-- 3. Students: ONLY verified companies that are invited to events

-- Drop existing policies if any
DROP POLICY IF EXISTS "Companies visible to admins" ON companies;
DROP POLICY IF EXISTS "Companies visible to themselves" ON companies;
DROP POLICY IF EXISTS "Students see only verified invited companies" ON companies;

-- Admin can see all companies (including pending)
CREATE POLICY "Admins can see all companies"
ON companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Company can see their own profile
CREATE POLICY "Companies can see their own profile"
ON companies FOR SELECT
USING (profile_id = auth.uid());

-- Students can ONLY see verified companies that are invited to active events
CREATE POLICY "Students see only verified invited companies"
ON companies FOR SELECT
USING (
  is_verified = true
  AND verification_status = 'verified'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    WHERE ep.company_id = companies.id
    AND e.is_active = true
  )
);

-- ============================================
-- PART 2: Offers Visibility (Only from Verified Companies)
-- ============================================

DROP POLICY IF EXISTS "Offers from verified companies only" ON offers;

-- Students can only see offers from verified companies invited to events
CREATE POLICY "Students see offers from verified invited companies"
ON offers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = offers.company_id
    AND c.is_verified = true
    AND c.verification_status = 'verified'
    AND EXISTS (
      SELECT 1 FROM event_participants ep
      JOIN events e ON ep.event_id = e.id
      WHERE ep.company_id = c.id
      AND e.is_active = true
    )
  )
);

-- ============================================
-- PART 3: Event Participants Protection
-- ============================================

-- Only verified companies can be invited
CREATE OR REPLACE FUNCTION check_company_verified_before_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if company is verified
  IF NOT EXISTS (
    SELECT 1 FROM companies
    WHERE id = NEW.company_id
    AND is_verified = true
    AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Cannot invite unverified company. Company must be verified by admin first.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to prevent inviting unverified companies
DROP TRIGGER IF EXISTS trg_check_company_verified ON event_participants;
CREATE TRIGGER trg_check_company_verified
  BEFORE INSERT ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_company_verified_before_invite();

-- ============================================
-- PART 4: Rate Limiting (Prevent Spam Registrations)
-- ============================================

-- Table to track registration attempts
CREATE TABLE IF NOT EXISTS registration_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text,
  role text,
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip 
ON registration_attempts(ip_address, created_at);

-- Function to check rate limiting
CREATE OR REPLACE FUNCTION check_registration_rate_limit(
  check_ip inet,
  check_email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  attempts_count integer;
  email_attempts integer;
BEGIN
  -- Check IP-based rate limit (max 5 registrations per hour)
  SELECT COUNT(*) INTO attempts_count
  FROM registration_attempts
  WHERE ip_address = check_ip
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF attempts_count >= 5 THEN
    RETURN false; -- Rate limit exceeded
  END IF;
  
  -- Check email-based attempts (prevent email enumeration)
  IF check_email IS NOT NULL THEN
    SELECT COUNT(*) INTO email_attempts
    FROM registration_attempts
    WHERE email = check_email
    AND created_at > NOW() - INTERVAL '24 hours';
    
    IF email_attempts >= 3 THEN
      RETURN false; -- Too many attempts with same email
    END IF;
  END IF;
  
  RETURN true; -- OK to proceed
END;
$$;

-- ============================================
-- PART 5: Admin Notification for New Companies
-- ============================================

-- Function to notify admins when new company registers
CREATE OR REPLACE FUNCTION notify_admin_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert notification for all admins
  INSERT INTO notifications (user_id, title, message, type, action_url)
  SELECT 
    p.id,
    '🏢 New Company Registration',
    'Company "' || NEW.company_name || '" has registered and needs verification.',
    'admin_review',
    '/admin/companies'
  FROM profiles p
  WHERE p.role = 'admin';
  
  RETURN NEW;
END;
$$;

-- Trigger to notify admins
DROP TRIGGER IF EXISTS trg_notify_admin_new_company ON companies;
CREATE TRIGGER trg_notify_admin_new_company
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_company();

-- ============================================
-- PART 6: Utility Functions for Admins
-- ============================================

-- Function to get pending companies count
CREATE OR REPLACE FUNCTION get_pending_companies_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM companies
  WHERE verification_status = 'pending';
$$;

-- Function to verify a company (admin only)
CREATE OR REPLACE FUNCTION verify_company(
  company_id_to_verify uuid,
  admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  company_record record;
BEGIN
  -- Check if user is admin
  admin_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Update company
  UPDATE companies
  SET 
    is_verified = true,
    verification_status = 'verified',
    verified_by = admin_user_id,
    verified_at = NOW()
  WHERE id = company_id_to_verify
  RETURNING * INTO company_record;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Company not found');
  END IF;
  
  -- Log admin action
  INSERT INTO admin_actions (
    admin_id, 
    action_type, 
    target_table, 
    target_id,
    description
  ) VALUES (
    admin_user_id,
    'verify_company',
    'companies',
    company_id_to_verify,
    'Verified company: ' || company_record.company_name || 
    CASE WHEN admin_notes IS NOT NULL THEN ' - ' || admin_notes ELSE '' END
  );
  
  -- Notify company
  INSERT INTO notifications (user_id, title, message, type)
  SELECT 
    company_record.profile_id,
    '✅ Company Verified',
    'Your company "' || company_record.company_name || '" has been verified! You can now participate in events.',
    'success';
  
  RETURN json_build_object(
    'success', true, 
    'company_id', company_id_to_verify,
    'company_name', company_record.company_name
  );
END;
$$;

-- Function to reject a company
CREATE OR REPLACE FUNCTION reject_company(
  company_id_to_reject uuid,
  rejection_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  company_record record;
BEGIN
  -- Check if user is admin
  admin_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Update company
  UPDATE companies
  SET 
    verification_status = 'rejected',
    rejection_reason = rejection_reason
  WHERE id = company_id_to_reject
  RETURNING * INTO company_record;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Company not found');
  END IF;
  
  -- Log admin action
  INSERT INTO admin_actions (
    admin_id, 
    action_type, 
    target_table, 
    target_id,
    description
  ) VALUES (
    admin_user_id,
    'reject_company',
    'companies',
    company_id_to_reject,
    'Rejected company: ' || company_record.company_name || ' - Reason: ' || rejection_reason
  );
  
  -- Notify company
  INSERT INTO notifications (user_id, title, message, type)
  SELECT 
    company_record.profile_id,
    '❌ Company Verification Rejected',
    'Your company registration was not approved. Reason: ' || rejection_reason,
    'error';
  
  RETURN json_build_object('success', true, 'company_id', company_id_to_reject);
END;
$$;

-- ============================================
-- PART 7: Comments and Documentation
-- ============================================

COMMENT ON POLICY "Students see only verified invited companies" ON companies IS 
'Students can only see companies that are: 1) Verified by admin, 2) Invited to active events';

COMMENT ON FUNCTION verify_company IS 
'Admin function to verify a company. Logs action and notifies company.';

COMMENT ON FUNCTION reject_company IS 
'Admin function to reject a company registration. Requires reason.';

COMMENT ON FUNCTION check_registration_rate_limit IS 
'Rate limiting: Max 5 registrations per IP per hour, max 3 per email per 24h';

-- Success message
SELECT '✅ Migration 22: Anti-Spam Protection applied successfully!' as status;
