-- =====================================================
-- FIX: Remove student_fields_required constraint
-- Migration: 20251118085738_fix_student_constraint
-- =====================================================
-- This migration removes the constraint that requires students
-- to have student_number, specialization, and graduation_year
-- at signup. Students can complete their profile later.
-- =====================================================

-- Drop the constraint that requires student fields to be NOT NULL
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS student_fields_required;

-- Make student-specific columns explicitly nullable
ALTER TABLE public.profiles 
ALTER COLUMN student_number DROP NOT NULL,
ALTER COLUMN specialization DROP NOT NULL,
ALTER COLUMN graduation_year DROP NOT NULL;

-- Add a comment to clarify that student fields are optional at signup
COMMENT ON COLUMN public.profiles.student_number IS 'Optional at signup - students can complete their profile later';
COMMENT ON COLUMN public.profiles.specialization IS 'Optional at signup - students can complete their profile later';
COMMENT ON COLUMN public.profiles.graduation_year IS 'Optional at signup - students can complete their profile later';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Dropped student_fields_required constraint
-- ✅ Made student-specific columns explicitly nullable
-- ✅ Added comments to clarify optional nature of fields
-- 
-- Note: Students can now sign up without providing student_number,
-- specialization, or graduation_year. These can be collected later
-- in the profile completion flow or when they try to book interviews.
-- =====================================================
