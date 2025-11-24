-- =====================================================
-- Add Enhanced Student Profile Fields
-- Migration: 20250102000001_add_student_profile_fields
-- =====================================================
-- This migration adds new fields to the profiles table for enhanced student profiles:
-- - profile_photo_url: URL to profile photo in storage
-- - languages_spoken: Array of languages the student speaks
-- - program: Program type (Bachelor's or IVET)
-- - biography: Student biography/description
-- - linkedin_url: LinkedIn profile URL
-- - resume_url: Resume/CV file URL (keeping cv_url for backward compatibility)
-- - year_of_study: Current academic year (1, 2, 3, etc.)
-- =====================================================

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS program TEXT CHECK (program IS NULL OR program IN ('Bachelor''s', 'IVET')),
ADD COLUMN IF NOT EXISTS biography TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS year_of_study INTEGER CHECK (year_of_study IS NULL OR (year_of_study >= 1 AND year_of_study <= 10));

-- Drop existing constraints if they exist (for idempotency)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_linkedin_url;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_profile_photo_url;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_resume_url;

-- Add constraint for LinkedIn URL format (optional, but should be valid if provided)
ALTER TABLE profiles
ADD CONSTRAINT valid_linkedin_url CHECK (
    linkedin_url IS NULL OR 
    linkedin_url ~* '^https?://(www\.)?linkedin\.com/in/'
);

-- Add constraint for profile photo URL format
ALTER TABLE profiles
ADD CONSTRAINT valid_profile_photo_url CHECK (
    profile_photo_url IS NULL OR 
    profile_photo_url ~* '^https?://'
);

-- Add constraint for resume URL format
ALTER TABLE profiles
ADD CONSTRAINT valid_resume_url CHECK (
    resume_url IS NULL OR 
    resume_url ~* '^https?://'
);

-- Add comments for documentation
COMMENT ON COLUMN profiles.profile_photo_url IS 'URL to profile photo stored in Supabase Storage';
COMMENT ON COLUMN profiles.languages_spoken IS 'Array of languages the student speaks (e.g., {"English", "French", "Arabic"})';
COMMENT ON COLUMN profiles.program IS 'Program type: Bachelor''s or IVET';
COMMENT ON COLUMN profiles.biography IS 'Student biography or description';
COMMENT ON COLUMN profiles.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN profiles.resume_url IS 'Resume/CV file URL stored in Supabase Storage';
COMMENT ON COLUMN profiles.year_of_study IS 'Current academic year (1, 2, 3, etc.)';

-- Update the updated_at timestamp trigger if it exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

