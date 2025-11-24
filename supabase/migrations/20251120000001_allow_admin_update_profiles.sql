-- =====================================================
-- Allow Admins to Update Profiles
-- Migration: 20251120000001_allow_admin_update_profiles
-- =====================================================

-- Check if the policy already exists before creating it to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Admins can update any profile'
    ) THEN
        CREATE POLICY "Admins can update any profile" ON profiles
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END
$$;

-- Also ensure admins can delete profiles if needed (optional but good for management)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Admins can delete any profile'
    ) THEN
        CREATE POLICY "Admins can delete any profile" ON profiles
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END
$$;
