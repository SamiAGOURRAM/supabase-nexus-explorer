-- =====================================================
-- Auto-create profiles and companies on signup
-- Triggered by Supabase Auth user creation
-- =====================================================

-- Function to automatically create profile when a new user signs up
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
BEGIN
    -- Get metadata from user
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';
    user_is_deprioritized := COALESCE((NEW.raw_user_meta_data->>'is_deprioritized')::boolean, false);

    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, role, is_deprioritized, phone)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_role::user_role,
        user_is_deprioritized,
        user_phone
    );

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
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
