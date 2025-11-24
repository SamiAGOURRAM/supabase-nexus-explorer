-- =====================================================
-- Add email column to companies table
-- Migration: 20251119000005_add_email_to_companies
-- =====================================================

-- Add email column to companies table (for companies invited before account creation)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email searches
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

COMMENT ON COLUMN companies.email IS 
'Email address for companies invited before they create an account. Once profile is linked, this may differ from profile.email.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
