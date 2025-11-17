-- =====================================================
-- Script to Create Admin Account
-- =====================================================
-- 
-- This script helps you create an admin account.
-- 
-- IMPORTANT: You need to create the auth user FIRST in Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Enter email and password
-- 4. Copy the user's UUID (you'll need it below)
-- 
-- Then run this script, replacing:
-- - 'YOUR_USER_UUID_HERE' with the actual UUID from step 4
-- - 'admin@example.com' with the admin email
-- - 'Admin User' with the admin's full name
-- =====================================================

-- Step 1: Update the auth user's metadata to set role as admin
-- Replace 'YOUR_USER_UUID_HERE' with the actual user UUID
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_build_object(
    'role', 'admin',
    'full_name', 'Admin User'
  ) || COALESCE(raw_user_meta_data, '{}'::jsonb)
WHERE id = 'YOUR_USER_UUID_HERE';

-- Step 2: Create or update the profile with admin role
-- Replace 'YOUR_USER_UUID_HERE' with the actual user UUID
-- Replace 'admin@example.com' with the admin email
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_deprioritized,
  created_at,
  updated_at
)
VALUES (
  'YOUR_USER_UUID_HERE',
  'admin@example.com',
  'Admin User',
  'admin',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Step 3: Ensure user_roles entry exists (if using user_roles table)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_UUID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Verify the admin account was created
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  u.email_confirmed_at,
  u.created_at as user_created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = 'YOUR_USER_UUID_HERE'
  AND p.role = 'admin';

-- Expected output: Should show 1 row with role='admin'
-- =====================================================

