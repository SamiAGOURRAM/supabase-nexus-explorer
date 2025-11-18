-- =====================================================
-- FIX: Ensure profiles are created for all users
-- Migration: 20250101000003_fix_missing_profiles
-- =====================================================
-- This migration:
-- 1. Ensures trigger fires on ALL user inserts (not just confirmed)
-- 2. Creates profiles for existing users who don't have them
-- 3. Fixes any orphaned users
-- =====================================================

-- Step 1: Update trigger to fire on ALL inserts (not just confirmed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Create trigger that fires on ALL inserts
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create backup trigger for email confirmation
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE OF confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
    EXECUTE FUNCTION public.handle_new_user();

-- Step 2: Create profiles for all existing users who don't have them
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_deprioritized,
    phone,
    student_number,
    specialization,
    graduation_year
)
SELECT 
    u.id,
    u.email,
    COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
        split_part(u.email, '@', 1)
    ) as full_name,
    COALESCE(
        (u.raw_user_meta_data->>'role')::user_role,
        'student'::user_role
    ) as role,
    COALESCE(
        (u.raw_user_meta_data->>'is_deprioritized')::boolean,
        false
    ) as is_deprioritized,
    NULLIF(TRIM(u.raw_user_meta_data->>'phone'), '') as phone,
    NULLIF(TRIM(u.raw_user_meta_data->>'student_number'), '') as student_number,
    NULLIF(TRIM(u.raw_user_meta_data->>'specialization'), '') as specialization,
    CASE 
        WHEN u.raw_user_meta_data->>'graduation_year' ~ '^[0-9]+$'
        THEN (u.raw_user_meta_data->>'graduation_year')::INTEGER
        ELSE NULL
    END as graduation_year
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create company records for users with company role who don't have companies
INSERT INTO public.companies (
    profile_id,
    company_name,
    description,
    website,
    email,
    is_verified,
    verification_status
)
SELECT 
    p.id,
    COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'company_name'), ''),
        'Company Name'
    ) as company_name,
    NULLIF(TRIM(u.raw_user_meta_data->>'description'), '') as description,
    NULLIF(TRIM(u.raw_user_meta_data->>'website'), '') as website,
    u.email,
    false,
    'pending'
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN public.companies c ON c.profile_id = p.id
WHERE p.role = 'company'
  AND c.profile_id IS NULL
ON CONFLICT (profile_id) DO NOTHING;

-- Step 4: Create a helper function to manually create profile for a user
CREATE OR REPLACE FUNCTION public.create_profile_for_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_record RECORD;
    v_profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
    
    IF v_profile_exists THEN
        RETURN true; -- Profile already exists
    END IF;

    -- Get user record
    SELECT * INTO v_user_record
    FROM auth.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
    END IF;

    -- Create profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_deprioritized,
        phone
    )
    VALUES (
        v_user_record.id,
        v_user_record.email,
        COALESCE(
            NULLIF(TRIM(v_user_record.raw_user_meta_data->>'full_name'), ''),
            split_part(v_user_record.email, '@', 1)
        ),
        COALESCE(
            (v_user_record.raw_user_meta_data->>'role')::user_role,
            'student'::user_role
        ),
        COALESCE(
            (v_user_record.raw_user_meta_data->>'is_deprioritized')::boolean,
            false
        ),
        NULLIF(TRIM(v_user_record.raw_user_meta_data->>'phone'), '')
    )
    ON CONFLICT (id) DO NOTHING;

    -- If company role, create company record
    IF COALESCE((v_user_record.raw_user_meta_data->>'role')::user_role, 'student'::user_role) = 'company' THEN
        INSERT INTO public.companies (
            profile_id,
            company_name,
            email,
            is_verified,
            verification_status
        )
        VALUES (
            v_user_record.id,
            COALESCE(
                NULLIF(TRIM(v_user_record.raw_user_meta_data->>'company_name'), ''),
                'Company Name'
            ),
            v_user_record.email,
            false,
            'pending'
        )
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;

    RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_profile_for_user(UUID) TO authenticated, anon;

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Updated trigger to fire on ALL user inserts
-- ✅ Created profiles for all existing users without profiles
-- ✅ Created company records for company users without companies
-- ✅ Added helper function to manually create profiles
-- 
-- To manually create a profile for a user, run:
-- SELECT public.create_profile_for_user('USER_ID_HERE'::UUID);
-- =====================================================

