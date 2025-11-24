-- =====================================================
-- FIX: Make LinkedIn URL constraint more lenient
-- Migration: 20250102000005_fix_linkedin_url_constraint
-- =====================================================
-- This migration updates the LinkedIn URL constraint to:
-- 1. Allow NULL values (empty URLs)
-- 2. Allow empty strings (will be converted to NULL)
-- 3. Validate format only when a value is provided
-- =====================================================

-- Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_linkedin_url;

-- Recreate with more lenient validation
-- Allows NULL, empty string, or valid LinkedIn URL format
ALTER TABLE profiles
ADD CONSTRAINT valid_linkedin_url CHECK (
    linkedin_url IS NULL OR 
    linkedin_url = '' OR
    linkedin_url ~* '^https?://(www\.)?linkedin\.com/in/'
);

-- Documentation
COMMENT ON CONSTRAINT valid_linkedin_url ON profiles IS 
  'Validates LinkedIn URL format. Allows NULL, empty string, or valid LinkedIn profile URL.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Updated valid_linkedin_url constraint to allow empty strings
-- ✅ More lenient validation for better UX
-- =====================================================

