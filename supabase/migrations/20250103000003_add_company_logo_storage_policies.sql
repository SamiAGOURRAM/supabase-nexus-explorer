-- =====================================================
-- Add RLS Policies for Company Logo Uploads
-- Migration: 20250103000003_add_company_logo_storage_policies
-- =====================================================
-- This migration adds RLS policies to allow admins and companies
-- to upload/update/delete company logos in the profile-photos bucket.
-- Company logos use path structure: company/{companyId}/{filename}
-- =====================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Companies can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Companies can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Companies can delete their own logos" ON storage.objects;

-- Allow admins to upload company logos
-- Path structure: company/{companyId}/{filename}
CREATE POLICY "Admins can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow admins to update company logos
CREATE POLICY "Admins can update company logos"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow admins to delete company logos
CREATE POLICY "Admins can delete company logos"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow companies to upload their own logos
-- Path structure: company/{companyId}/{filename}
-- Company must match the companyId in the path
CREATE POLICY "Companies can upload their own logos"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    EXISTS (
        SELECT 1 FROM companies c
        JOIN profiles p ON p.id = c.profile_id
        WHERE c.id::text = (storage.foldername(name))[2]
        AND p.id = auth.uid()
    )
);

-- Allow companies to update their own logos
CREATE POLICY "Companies can update their own logos"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    EXISTS (
        SELECT 1 FROM companies c
        JOIN profiles p ON p.id = c.profile_id
        WHERE c.id::text = (storage.foldername(name))[2]
        AND p.id = auth.uid()
    )
);

-- Allow companies to delete their own logos
CREATE POLICY "Companies can delete their own logos"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    EXISTS (
        SELECT 1 FROM companies c
        JOIN profiles p ON p.id = c.profile_id
        WHERE c.id::text = (storage.foldername(name))[2]
        AND p.id = auth.uid()
    )
);

-- =====================================================
-- Migration Complete! ✅
-- =====================================================
-- Company logos can now be uploaded by:
-- 1. Admins (to any company folder)
-- 2. Companies (to their own company folder only)
-- Path structure: company/{companyId}/{timestamp}.{ext}
-- =====================================================

