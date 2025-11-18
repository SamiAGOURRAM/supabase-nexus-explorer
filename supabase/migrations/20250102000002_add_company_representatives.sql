-- =====================================================
-- Add Company Representatives Table
-- Migration: 20250102000002_add_company_representatives
-- =====================================================
-- This migration creates a separate table for company representatives
-- to allow multiple representatives per company with their contact information.
-- =====================================================

-- Create company_representatives table
CREATE TABLE IF NOT EXISTS company_representatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    title TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_representatives_company_id ON company_representatives(company_id);
CREATE INDEX IF NOT EXISTS idx_company_representatives_email ON company_representatives(email);

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_company_representatives_updated_at ON company_representatives;

-- Add updated_at trigger
CREATE TRIGGER update_company_representatives_updated_at
    BEFORE UPDATE ON company_representatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE company_representatives IS 'Company representatives with their contact information';
COMMENT ON COLUMN company_representatives.company_id IS 'Reference to the company';
COMMENT ON COLUMN company_representatives.full_name IS 'Full name of the representative';
COMMENT ON COLUMN company_representatives.title IS 'Job title/position of the representative';
COMMENT ON COLUMN company_representatives.phone IS 'Phone number of the representative';
COMMENT ON COLUMN company_representatives.email IS 'Email address of the representative';

-- Enable RLS
ALTER TABLE company_representatives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Companies can view their own representatives" ON company_representatives;
DROP POLICY IF EXISTS "Companies can insert their own representatives" ON company_representatives;
DROP POLICY IF EXISTS "Companies can update their own representatives" ON company_representatives;
DROP POLICY IF EXISTS "Companies can delete their own representatives" ON company_representatives;
DROP POLICY IF EXISTS "Admins can view all representatives" ON company_representatives;
DROP POLICY IF EXISTS "Admins can manage all representatives" ON company_representatives;
DROP POLICY IF EXISTS "Students can view representatives of verified companies" ON company_representatives;

-- RLS Policies
-- Companies can view and manage their own representatives
CREATE POLICY "Companies can view their own representatives"
    ON company_representatives
    FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM companies WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Companies can insert their own representatives"
    ON company_representatives
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Companies can update their own representatives"
    ON company_representatives
    FOR UPDATE
    USING (
        company_id IN (
            SELECT id FROM companies WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Companies can delete their own representatives"
    ON company_representatives
    FOR DELETE
    USING (
        company_id IN (
            SELECT id FROM companies WHERE profile_id = auth.uid()
        )
    );

-- Admins can view all representatives
CREATE POLICY "Admins can view all representatives"
    ON company_representatives
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can manage all representatives
CREATE POLICY "Admins can manage all representatives"
    ON company_representatives
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Students can view representatives of verified companies
CREATE POLICY "Students can view representatives of verified companies"
    ON company_representatives
    FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM companies WHERE is_verified = true
        )
    );

