-- =====================================================
-- Allow Admins to Manage Offers
-- Migration: 20251120000002_allow_admin_manage_offers
-- =====================================================

-- Check if the policy already exists before creating it to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'offers'
        AND policyname = 'Admins can update any offer'
    ) THEN
        CREATE POLICY "Admins can update any offer" ON offers
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'offers'
        AND policyname = 'Admins can delete any offer'
    ) THEN
        CREATE POLICY "Admins can delete any offer" ON offers
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

-- Also ensure admins can insert offers if needed (though usually companies do this)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'offers'
        AND policyname = 'Admins can insert offers'
    ) THEN
        CREATE POLICY "Admins can insert offers" ON offers
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END
$$;
