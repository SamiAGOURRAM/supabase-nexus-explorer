-- =====================================================
-- GDPR Data Retention Cleanup Function
-- Migration: 20250103000002_gdpr_data_retention_cleanup
-- =====================================================
-- This migration creates a function to automatically clean up
-- expired data based on retention policies
-- =====================================================

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(
    deleted_profiles INTEGER,
    deleted_bookings INTEGER,
    deleted_offers INTEGER,
    deleted_companies INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_profiles INTEGER := 0;
    v_deleted_bookings INTEGER := 0;
    v_deleted_offers INTEGER := 0;
    v_deleted_companies INTEGER := 0;
    v_expired_user_ids UUID[];
BEGIN
    -- Find profiles that have exceeded their retention period
    -- AND have not been active recently
    SELECT ARRAY_AGG(id) INTO v_expired_user_ids
    FROM profiles
    WHERE data_retention_until IS NOT NULL
    AND data_retention_until < NOW()
    AND (
        -- For students: also check if they have recent bookings
        (role = 'student' AND NOT EXISTS (
            SELECT 1 FROM bookings b
            JOIN event_slots es ON b.slot_id = es.id
            JOIN events e ON es.event_id = e.id
            WHERE b.student_id = profiles.id
            AND e.date > NOW() - INTERVAL '12 months'
        ))
        OR
        -- For companies: check if they have recent event participations
        (role = 'company' AND NOT EXISTS (
            SELECT 1 FROM event_participants ep
            JOIN events e ON ep.event_id = e.id
            JOIN companies c ON ep.company_id = c.id
            WHERE c.profile_id = profiles.id
            AND e.date > NOW() - INTERVAL '24 months'
        ))
    );

    -- If no expired profiles, return zeros
    IF v_expired_user_ids IS NULL OR array_length(v_expired_user_ids, 1) = 0 THEN
        RETURN QUERY SELECT 0, 0, 0, 0;
        RETURN;
    END IF;

    -- Delete bookings for expired users (cascades from profile deletion, but explicit for logging)
    DELETE FROM bookings
    WHERE student_id = ANY(v_expired_user_ids)
    RETURNING id INTO v_deleted_bookings;

    -- Delete offers for expired companies
    DELETE FROM offers
    WHERE company_id IN (
        SELECT id FROM companies WHERE profile_id = ANY(v_expired_user_ids)
    )
    RETURNING id INTO v_deleted_offers;

    -- Delete companies for expired users
    DELETE FROM companies
    WHERE profile_id = ANY(v_expired_user_ids)
    RETURNING id INTO v_deleted_companies;

    -- Finally, delete profiles (this will cascade to other related data)
    DELETE FROM profiles
    WHERE id = ANY(v_expired_user_ids)
    RETURNING id INTO v_deleted_profiles;

    -- Return summary
    RETURN QUERY SELECT 
        COALESCE(v_deleted_profiles, 0),
        COALESCE(v_deleted_bookings, 0),
        COALESCE(v_deleted_offers, 0),
        COALESCE(v_deleted_companies, 0);
END;
$$;

-- Grant execute permission to authenticated users (admins only in practice)
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO authenticated;

-- Create a function to update retention periods based on activity
CREATE OR REPLACE FUNCTION update_retention_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- When a profile is updated, extend retention period if needed
    IF TG_OP = 'UPDATE' THEN
        -- Update retention period based on role
        IF NEW.role = 'student' THEN
            NEW.data_retention_until := NEW.updated_at + INTERVAL '12 months';
            NEW.retention_policy := '12_months';
        ELSIF NEW.role = 'company' THEN
            NEW.data_retention_until := NEW.updated_at + INTERVAL '24 months';
            NEW.retention_policy := 'until_partnership_ends';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to update retention on profile updates
DROP TRIGGER IF EXISTS trigger_update_retention_on_activity ON profiles;
CREATE TRIGGER trigger_update_retention_on_activity
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
    EXECUTE FUNCTION update_retention_on_activity();

-- Function to get retention status for a user
CREATE OR REPLACE FUNCTION get_retention_status(p_user_id UUID)
RETURNS TABLE(
    data_retention_until TIMESTAMPTZ,
    retention_policy TEXT,
    days_remaining INTEGER,
    is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.data_retention_until,
        p.retention_policy,
        CASE 
            WHEN p.data_retention_until IS NOT NULL 
            THEN EXTRACT(DAY FROM (p.data_retention_until - NOW()))::INTEGER
            ELSE NULL
        END as days_remaining,
        CASE 
            WHEN p.data_retention_until IS NOT NULL AND p.data_retention_until < NOW()
            THEN true
            ELSE false
        END as is_expired
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_retention_status(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION cleanup_expired_data() IS 
    'GDPR: Cleans up expired user data based on retention policies. Should be run periodically (e.g., monthly).';
COMMENT ON FUNCTION update_retention_on_activity() IS 
    'GDPR: Automatically extends retention period when user is active.';
COMMENT ON FUNCTION get_retention_status(UUID) IS 
    'GDPR: Returns retention status for a user, including days remaining until deletion.';

-- =====================================================
-- Migration Complete! ✅
-- =====================================================
-- Note: Set up a scheduled job (e.g., pg_cron or Supabase Edge Function)
-- to run cleanup_expired_data() monthly
-- =====================================================

