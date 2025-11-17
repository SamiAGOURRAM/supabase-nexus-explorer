# How to Create an Admin Account

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create Auth User
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add User"** > **"Create new user"**
4. Fill in:
   - **Email**: `admin@yourdomain.com` (or any email you want)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ Check this box
5. Click **"Create user"**
6. **Copy the User UUID** (you'll need it in the next step)

### Step 2: Update User Metadata
1. Still in the Users page, click on the user you just created
2. Scroll down to **"Raw User Meta Data"**
3. Click **"Edit"** and add:
   ```json
   {
     "role": "admin",
     "full_name": "Admin User"
   }
   ```
4. Click **"Save"**

### Step 3: Run SQL Script
1. Go to **SQL Editor** in Supabase Dashboard
2. Open `scripts/create_admin.sql`
3. Replace `YOUR_USER_UUID_HERE` with the UUID from Step 1
4. Replace `admin@example.com` with the email you used
5. Replace `Admin User` with the admin's name
6. Run the script

### Step 4: Verify
1. Try logging in with the admin email and password
2. You should be redirected to `/admin` dashboard

---

## Method 2: Using SQL Only (Advanced)

If you already have a user account and want to make it admin:

```sql
-- Replace 'user@example.com' with the actual email
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'admin',
  'full_name', 'Admin User'
) || COALESCE(raw_user_meta_data, '{}'::jsonb)
WHERE email = 'user@example.com';

-- Update profile
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'user@example.com';

-- Add to user_roles if table exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## Troubleshooting

### Profile doesn't exist?
If the profile wasn't created automatically, run:
```sql
-- Replace with actual UUID and email
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  'admin'::user_role
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### Can't access admin pages?
1. Check that `profiles.role = 'admin'`
2. Check that user is authenticated
3. Clear browser cache and cookies
4. Try logging out and back in

### Check current admin accounts:
```sql
SELECT 
  p.email,
  p.full_name,
  p.role,
  u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';
```

