-- =====================================================
-- Allow Admins to Manage Bookings
-- Migration: 20251120000003_allow_admin_manage_bookings
-- =====================================================

-- Check if the policy already exists before creating it to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'bookings'
        AND policyname = 'Admins can update any booking'
    ) THEN
        CREATE POLICY "Admins can update any booking" ON bookings
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
        WHERE tablename = 'bookings'
        AND policyname = 'Admins can delete any booking'
    ) THEN
        CREATE POLICY "Admins can delete any booking" ON bookings
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
