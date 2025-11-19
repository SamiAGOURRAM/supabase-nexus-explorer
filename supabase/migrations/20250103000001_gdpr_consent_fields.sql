-- =====================================================
-- GDPR Consent Fields Migration
-- Migration: 20250103000001_gdpr_consent_fields
-- =====================================================
-- This migration adds GDPR-compliant consent tracking fields
-- to the profiles table for both students and companies
-- =====================================================

-- Add consent fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_version TEXT,
ADD COLUMN IF NOT EXISTS consent_withdrawn BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_withdrawn_date TIMESTAMPTZ;

-- Add data retention fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retention_policy TEXT DEFAULT '12_months';

-- Add comments for documentation
COMMENT ON COLUMN profiles.consent_given IS 'GDPR: Whether user has given explicit consent for data processing';
COMMENT ON COLUMN profiles.consent_date IS 'GDPR: Date and time when consent was given';
COMMENT ON COLUMN profiles.consent_version IS 'GDPR: Version of privacy policy that was accepted';
COMMENT ON COLUMN profiles.consent_withdrawn IS 'GDPR: Whether user has withdrawn consent';
COMMENT ON COLUMN profiles.consent_withdrawn_date IS 'GDPR: Date and time when consent was withdrawn';
COMMENT ON COLUMN profiles.data_retention_until IS 'GDPR: Date until which data will be retained';
COMMENT ON COLUMN profiles.retention_policy IS 'GDPR: Retention policy applied (e.g., 12_months, until_partnership_ends)';

-- Create index for consent queries
CREATE INDEX IF NOT EXISTS idx_profiles_consent_given ON profiles(consent_given) WHERE consent_given = true;
CREATE INDEX IF NOT EXISTS idx_profiles_retention ON profiles(data_retention_until) WHERE data_retention_until IS NOT NULL;

-- Function to set default retention period based on role
CREATE OR REPLACE FUNCTION set_default_retention_period()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set default retention period based on role
    IF NEW.data_retention_until IS NULL THEN
        IF NEW.role = 'student' THEN
            -- Students: 12 months from creation or last activity
            NEW.data_retention_until := COALESCE(NEW.updated_at, NEW.created_at) + INTERVAL '12 months';
            NEW.retention_policy := '12_months';
        ELSIF NEW.role = 'company' THEN
            -- Companies: 24 months (until partnership ends)
            NEW.data_retention_until := COALESCE(NEW.updated_at, NEW.created_at) + INTERVAL '24 months';
            NEW.retention_policy := 'until_partnership_ends';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to set default retention period
DROP TRIGGER IF EXISTS trigger_set_default_retention ON profiles;
CREATE TRIGGER trigger_set_default_retention
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_default_retention_period();

-- Update existing profiles to set retention periods
UPDATE profiles
SET 
    data_retention_until = CASE 
        WHEN role = 'student' THEN COALESCE(updated_at, created_at) + INTERVAL '12 months'
        WHEN role = 'company' THEN COALESCE(updated_at, created_at) + INTERVAL '24 months'
        ELSE COALESCE(updated_at, created_at) + INTERVAL '12 months'
    END,
    retention_policy = CASE 
        WHEN role = 'student' THEN '12_months'
        WHEN role = 'company' THEN 'until_partnership_ends'
        ELSE '12_months'
    END
WHERE data_retention_until IS NULL;

-- =====================================================
-- Migration Complete! ✅
-- =====================================================

