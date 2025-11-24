-- =====================================================
-- FIX: Signup Trigger - Robust Error Handling
-- Migration: 20250101000001_fix_signup_trigger
-- =====================================================
-- This migration fixes the handle_new_user() trigger function
-- to properly handle signup errors and work with/without email verification
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Create improved trigger function with comprehensive error handling
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
    v_error_message TEXT;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN NEW;
    END IF;

    -- Get metadata with safe defaults
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        split_part(NEW.email, '@', 1)
    );
    user_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
    user_is_deprioritized := COALESCE(
        (NEW.raw_user_meta_data->>'is_deprioritized')::boolean,
        false
    );

    -- Validate required fields
    IF user_full_name IS NULL OR LENGTH(user_full_name) < 1 THEN
        user_full_name := split_part(NEW.email, '@', 1);
    END IF;

    -- Ensure role is valid
    IF user_role NOT IN ('student', 'company', 'admin') THEN
        user_role := 'student';
    END IF;

    -- Create profile - handle both student and non-student roles
    BEGIN
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
        VALUES (
            NEW.id,
            NEW.email,
            user_full_name,
            user_role::user_role,
            user_is_deprioritized,
            user_phone,
            NULLIF(TRIM(NEW.raw_user_meta_data->>'student_number'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'specialization'), ''),
            CASE 
                WHEN NEW.raw_user_meta_data->>'graduation_year' ~ '^[0-9]+$'
                THEN (NEW.raw_user_meta_data->>'graduation_year')::INTEGER
                ELSE NULL
            END
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the signup
            v_error_message := SQLERRM;
            RAISE WARNING 'Error creating profile for user %: %', NEW.id, v_error_message;
            -- Try to create a minimal profile as fallback
            BEGIN
                INSERT INTO public.profiles (
                    id,
                    email,
                    full_name,
                    role,
                    is_deprioritized
                )
                VALUES (
                    NEW.id,
                    NEW.email,
                    user_full_name,
                    user_role::user_role,
                    user_is_deprioritized
                )
                ON CONFLICT (id) DO NOTHING;
            EXCEPTION
                WHEN OTHERS THEN
                    -- If even the minimal profile fails, log and continue
                    RAISE WARNING 'Failed to create minimal profile for user %: %', NEW.id, SQLERRM;
            END;
    END;

    -- If company role, create company record
    IF user_role = 'company' THEN
        BEGIN
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
                COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'company_name'), ''),
                    'Company Name'
                ),
                NULLIF(TRIM(NEW.raw_user_meta_data->>'description'), ''),
                NULLIF(TRIM(NEW.raw_user_meta_data->>'website'), ''),
                false,
                'pending'
            )
            ON CONFLICT (profile_id) DO NOTHING;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log but don't fail - company can be created later
                RAISE WARNING 'Error creating company for user %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger 1: Fire on INSERT (works with or without email verification)
-- This will create the profile immediately when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger 2: Fire on UPDATE when email gets confirmed (backup for email verification)
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE OF confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon;

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Summary:
-- ✅ Fixed trigger function with comprehensive error handling
-- ✅ Works with or without email verification
-- ✅ Creates profile immediately on signup
-- ✅ Handles all edge cases gracefully
-- ✅ Logs errors without failing signup
-- =====================================================

