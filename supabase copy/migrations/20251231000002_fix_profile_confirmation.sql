-- =====================================================
-- FIX: Profile Creation on Email Confirmation
-- Migration: 20251231000002_fix_profile_confirmation
-- =====================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Improved function that handles both scenarios
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
END;
$$;

-- Trigger 1: Fire on INSERT if already confirmed (email verification disabled)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    WHEN (NEW.confirmed_at IS NOT NULL)
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger 2: Fire on UPDATE when email gets confirmed
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE OF confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
    EXECUTE FUNCTION public.handle_new_user();

-- Fix existing confirmed users without profiles
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

-- Fix companies
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
