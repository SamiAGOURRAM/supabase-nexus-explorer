-- =====================================================
-- Ensure Profile Visibility for All Authenticated Users
-- Migration: 20250102000006_ensure_profile_visibility
-- =====================================================
-- This migration ensures that:
-- 1. All authenticated users can view student profiles
-- 2. Companies can view all student profile information
-- 3. Students can view company profiles
-- 4. All profile fields are accessible
-- =====================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create comprehensive policy: All authenticated users can view all profiles
-- This allows:
-- - Companies to view student profiles
-- - Students to view other student profiles (if needed)
-- - Admins to view all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ensure companies can view student profiles
-- This is already covered by the above policy, but we add a comment for clarity
COMMENT ON POLICY "Authenticated users can view all profiles" ON public.profiles IS 
  'Allows all authenticated users (students, companies, admins) to view profile information including academic details, CV, resume, and contact information.';

-- =====================================================
-- Ensure Resume/CV Access for Companies
-- =====================================================

-- The storage policies already allow companies to read resumes of applicants
-- But we need to ensure the resume_url and cv_url fields in profiles are accessible
-- This is handled by the profile SELECT policy above

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ All authenticated users can view all profiles
-- ✅ Companies can see student academic information, CV, resume
-- ✅ Students can see company information
-- ✅ All profile fields are accessible via the API
-- =====================================================

