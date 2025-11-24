-- =====================================================
-- Setup Supabase Storage Buckets
-- Migration: 20250102000003_setup_storage_buckets
-- =====================================================
-- This migration creates storage buckets for profile photos and resumes
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This migration provides the SQL to set up RLS policies
-- =====================================================

-- Note: Buckets need to be created via Supabase Dashboard or Storage API
-- Buckets to create:
-- 1. profile-photos (public read, authenticated write)
-- 2. resumes (authenticated read/write)

-- RLS Policies for profile-photos bucket
-- These policies assume the bucket is named 'profile-photos'
-- File paths should be: {userId}/{filename}

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;

-- Create or update bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-photos',
    'profile-photos',
    true, -- Public read
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to read profile photos
CREATE POLICY "Public can read profile photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-photos');

-- Allow users to update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for resumes bucket
-- These policies assume the bucket is named 'resumes'
-- File paths should be: {userId}/{filename}

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Companies can read resumes of applicants" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON storage.objects;

-- Create or update bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false, -- Not public
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Allow authenticated users to upload their own resumes
CREATE POLICY "Users can upload their own resumes"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own resumes
CREATE POLICY "Users can read their own resumes"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow companies to read resumes of students who applied to their offers
CREATE POLICY "Companies can read resumes of applicants"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'resumes' AND
    EXISTS (
        SELECT 1 FROM bookings b
        JOIN event_slots es ON es.id = b.slot_id
        JOIN companies c ON c.id = es.company_id
        WHERE b.student_id::text = (storage.foldername(name))[1]
        AND c.profile_id = auth.uid()
    )
);

-- Allow admins to read all resumes
CREATE POLICY "Admins can read all resumes"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'resumes' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow users to update their own resumes
CREATE POLICY "Users can update their own resumes"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete their own resumes"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

