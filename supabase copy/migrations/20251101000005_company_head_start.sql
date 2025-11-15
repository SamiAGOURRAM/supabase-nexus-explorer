-- =====================================================
-- Company Head Start Feature
-- Allow unverified companies to create offers (invisible until admin verification)
-- =====================================================

-- =====================================================
-- Drop ALL existing policies to recreate them cleanly
-- =====================================================

-- Offers policies
DROP POLICY IF EXISTS "Active offers from verified companies are viewable by everyone" ON offers;
DROP POLICY IF EXISTS "Public can view verified company offers" ON offers;
DROP POLICY IF EXISTS "Company can manage their offers" ON offers;
DROP POLICY IF EXISTS "Companies can manage their own offers" ON offers;
DROP POLICY IF EXISTS "Admins can view all offers" ON offers;

-- Event Slots policies
DROP POLICY IF EXISTS "Active slots are viewable by everyone" ON event_slots;
DROP POLICY IF EXISTS "Public can view verified company slots" ON event_slots;
DROP POLICY IF EXISTS "Company can manage their slots" ON event_slots;
DROP POLICY IF EXISTS "Companies can manage their slots" ON event_slots;
DROP POLICY IF EXISTS "Admins can view all slots" ON event_slots;

-- =====================================================
-- NEW POLICIES: Companies can create offers immediately
-- =====================================================

-- 1. PUBLIC: Only see active offers from VERIFIED companies
CREATE POLICY "Public can view verified company offers" ON offers 
FOR SELECT 
USING (
    is_active = true 
    AND EXISTS (
        SELECT 1 FROM companies c 
        WHERE c.id = offers.company_id 
        AND c.is_verified = true
    )
);

-- 2. COMPANIES: Can create/view/edit their OWN offers (even if not verified)
CREATE POLICY "Companies can manage their own offers" ON offers 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM companies c 
        WHERE c.id = offers.company_id 
        AND c.profile_id = auth.uid()
    )
);

-- 3. ADMINS: Can see ALL offers (verified or not)
CREATE POLICY "Admins can view all offers" ON offers 
FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- SLOTS: Only verified companies' slots are bookable
-- =====================================================

-- Recreate with verification check
CREATE POLICY "Public can view verified company slots" ON event_slots 
FOR SELECT 
USING (
    is_active = true 
    AND EXISTS (
        SELECT 1 FROM companies c 
        WHERE c.id = event_slots.company_id 
        AND c.is_verified = true
    )
);

CREATE POLICY "Companies can manage their slots" ON event_slots 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM companies c 
        WHERE c.id = event_slots.company_id 
        AND c.profile_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all slots" ON event_slots 
FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- BOOKINGS: Students can only book verified companies
-- =====================================================

-- This is already handled in fn_book_interview(), but add extra safety
COMMENT ON TABLE bookings IS 'Students can only book slots from verified companies. Validation in fn_book_interview().';

-- =====================================================
-- Helper view for companies to see their verification status
-- =====================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS company_dashboard;

CREATE VIEW company_dashboard AS
SELECT 
    c.id AS company_id,
    c.profile_id,
    c.company_name,
    c.is_verified,
    c.verification_status,
    c.created_at,
    c.verified_at,
    c.rejection_reason,
    COUNT(DISTINCT o.id) AS total_offers,
    COUNT(DISTINCT o.id) FILTER (WHERE o.is_active = true) AS active_offers,
    COUNT(DISTINCT es.id) AS total_slots,
    COUNT(DISTINCT b.id) AS total_bookings,
    CASE 
        WHEN c.is_verified = false THEN 'Your offers are created but invisible to students until admin verification.'
        ELSE 'Your offers are live and visible to students!'
    END AS status_message
FROM companies c
LEFT JOIN offers o ON o.company_id = c.id
LEFT JOIN event_slots es ON es.company_id = c.id
LEFT JOIN bookings b ON b.slot_id = es.id
GROUP BY c.id, c.profile_id, c.company_name, c.is_verified, c.verification_status, c.created_at, c.verified_at, c.rejection_reason;

-- Grant access to authenticated users
GRANT SELECT ON company_dashboard TO authenticated;

-- Security: Companies filter by profile_id = auth.uid() in their queries
-- Admins can see all via their application logic

-- =====================================================
-- Notification for companies after signup
-- =====================================================

CREATE OR REPLACE FUNCTION notify_company_head_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Send welcome notification to new company
    IF NEW.verification_status = 'pending' THEN
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            NEW.profile_id,
            'Welcome to INF Platform 2.0!',
            'Your account has been created. You can start creating offers now! Note: Your offers will be visible to students only after admin verification. We will review your company profile shortly.',
            'info'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_welcome_notification ON companies;
CREATE TRIGGER company_welcome_notification
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION notify_company_head_start();

-- =====================================================
-- Update verification function to notify company
-- =====================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS fn_verify_company(UUID, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS fn_verify_company(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_verify_company(company_id_to_verify UUID, verify_status BOOLEAN, reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role TEXT;
    company_record RECORD;
    company_profile_id UUID;
BEGIN
    -- Check if caller is admin
    SELECT role INTO admin_role FROM profiles WHERE id = auth.uid();
    IF admin_role != 'admin' THEN
        RETURN json_build_object('success', false, 'error', 'Admin access required');
    END IF;

    -- Get company info
    SELECT * INTO company_record FROM companies WHERE id = company_id_to_verify;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Company not found');
    END IF;

    company_profile_id := company_record.profile_id;

    -- Update company verification
    IF verify_status = true THEN
        UPDATE companies
        SET 
            is_verified = true,
            verification_status = 'verified',
            verified_by = auth.uid(),
            verified_at = NOW(),
            rejection_reason = NULL,
            updated_at = NOW()
        WHERE id = company_id_to_verify;

        -- Notify company of approval
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            company_profile_id,
            'Company Verified! 🎉',
            'Congratulations! Your company has been verified by an admin. Your offers are now visible to all students on the platform.',
            'success'
        );

        -- Log admin action
        INSERT INTO admin_actions (admin_id, action_type, target_id, details)
        VALUES (auth.uid(), 'company_verified', company_id_to_verify, 
                json_build_object('company_name', company_record.company_name));

    ELSE
        UPDATE companies
        SET 
            is_verified = false,
            verification_status = 'rejected',
            rejection_reason = reason,
            updated_at = NOW()
        WHERE id = company_id_to_verify;

        -- Notify company of rejection
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            company_profile_id,
            'Company Verification Update',
            'Your company verification was not approved. Reason: ' || COALESCE(reason, 'No reason provided') || '. Please contact an administrator for more information.',
            'warning'
        );

        -- Log admin action
        INSERT INTO admin_actions (admin_id, action_type, target_id, details)
        VALUES (auth.uid(), 'company_rejected', company_id_to_verify, 
                json_build_object('company_name', company_record.company_name, 'reason', reason));
    END IF;

    RETURN json_build_object(
        'success', true,
        'company_id', company_id_to_verify,
        'verified', verify_status,
        'message', CASE WHEN verify_status THEN 'Company verified successfully' ELSE 'Company rejected' END
    );
END;
$$;
