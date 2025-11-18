-- =====================================================
-- FIX: Ensure all students have profiles and user_roles
-- Migration: 20250115000001_fix_student_profiles_and_roles
-- =====================================================
-- This migration ensures:
-- 1. All confirmed users have profiles (defaulting to 'student' role)
-- 2. All profiles have corresponding entries in user_roles table
-- 3. The handle_new_user() function populates user_roles table
-- =====================================================

-- Ensure app_role enum exists (should already exist, but safe check)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'company', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure user_roles table exists (should already exist, but safe check)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Step 1: Update handle_new_user() to also populate user_roles table
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_phone TEXT;
    user_is_deprioritized BOOLEAN;
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN NEW;
    END IF;

    -- Get metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';
    user_is_deprioritized := COALESCE((NEW.raw_user_meta_data->>'is_deprioritized')::boolean, false);

    -- Create profile with student-specific fields if needed
    IF user_role = 'student' THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, is_deprioritized, phone,
            student_number, specialization, graduation_year
        )
        VALUES (
            NEW.id,
            NEW.email,
            user_full_name,
            user_role::user_role,
            user_is_deprioritized,
            user_phone,
            -- NULL by default - user fills later in profile
            (NEW.raw_user_meta_data->>'student_number')::TEXT,
            (NEW.raw_user_meta_data->>'specialization')::TEXT,
            (NEW.raw_user_meta_data->>'graduation_year')::INTEGER
        )
        ON CONFLICT (id) DO NOTHING;
    ELSE
        INSERT INTO public.profiles (id, email, full_name, role, is_deprioritized, phone)
        VALUES (
            NEW.id,
            NEW.email,
            user_full_name,
            user_role::user_role,
            user_is_deprioritized,
            user_phone
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create user_role entry (CRITICAL: This was missing!)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::text::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If company, create company record
    IF user_role = 'company' THEN
        INSERT INTO public.companies (
            profile_id,
            company_name,
            description,
            website,
            is_verified,
            verification_status
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name'),
            NEW.raw_user_meta_data->>'description',
            NEW.raw_user_meta_data->>'website',
            false,
            'pending'
        )
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 2: Remove strict constraint to allow incomplete student profiles
-- =====================================================
-- Drop the strict constraint that requires student fields to be NOT NULL
-- Students can complete their profile later (student_number, specialization, graduation_year)
-- The constraint will be re-added later if needed, but for now we allow incomplete profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS student_fields_required;

-- Step 3: Fix existing confirmed users without profiles
-- =====================================================
-- Create profiles for all confirmed users that don't have one
-- Default to 'student' role if not specified
-- Note: student fields can be NULL - students will complete their profile later
INSERT INTO public.profiles (id, email, full_name, role, is_deprioritized, phone, student_number, specialization, graduation_year)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    COALESCE((u.raw_user_meta_data->>'role')::user_role, 'student'::user_role) as role,
    COALESCE((u.raw_user_meta_data->>'is_deprioritized')::boolean, false),
    u.raw_user_meta_data->>'phone',
    -- NULL by default - students fill later
    CASE 
        WHEN COALESCE((u.raw_user_meta_data->>'role')::user_role, 'student'::user_role) = 'student' 
        THEN (u.raw_user_meta_data->>'student_number')::TEXT
        ELSE NULL
    END,
    CASE 
        WHEN COALESCE((u.raw_user_meta_data->>'role')::user_role, 'student'::user_role) = 'student' 
        THEN (u.raw_user_meta_data->>'specialization')::TEXT
        ELSE NULL
    END,
    CASE 
        WHEN COALESCE((u.raw_user_meta_data->>'role')::user_role, 'student'::user_role) = 'student' 
        THEN (u.raw_user_meta_data->>'graduation_year')::INTEGER
        ELSE NULL
    END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.confirmed_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Fix existing profiles that don't have entries in user_roles table
-- =====================================================
INSERT INTO public.user_roles (user_id, role)
SELECT 
    p.id,
    p.role::text::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role::text = p.role::text
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Ensure all profiles have a valid role (default to 'student' if NULL)
-- =====================================================
UPDATE public.profiles
SET role = 'student'::user_role
WHERE role IS NULL
  AND id IN (SELECT id FROM auth.users WHERE confirmed_at IS NOT NULL);

-- Step 6: Fix companies for existing company profiles
-- =====================================================
INSERT INTO public.companies (profile_id, company_name, is_verified, verification_status)
SELECT 
    p.id,
    COALESCE(u.raw_user_meta_data->>'company_name', 'Company Name'),
    false,
    'pending'
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN public.companies c ON c.profile_id = p.id
WHERE p.role = 'company' 
  AND c.profile_id IS NULL
ON CONFLICT (profile_id) DO NOTHING;

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Updated handle_new_user() to populate user_roles table
-- ✅ Removed strict student_fields_required constraint (allows incomplete profiles)
-- ✅ Created profiles for all confirmed users without profiles
-- ✅ Created user_roles entries for all profiles missing them
-- ✅ Fixed NULL roles (defaulted to 'student')
-- ✅ Fixed company records for company profiles
-- 
-- Note: The student_fields_required constraint was removed to allow students
-- to sign up and complete their profile (student_number, specialization, graduation_year) later.
-- You can enforce profile completion at the application level when students try to book.
-- =====================================================

