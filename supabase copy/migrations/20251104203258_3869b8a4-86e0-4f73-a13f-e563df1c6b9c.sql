-- =====================================================
-- CRITICAL SECURITY FIXES - Error Level Issues
-- =====================================================

-- 1. CREATE USER_ROLES TABLE (Fix privilege escalation)
-- =====================================================

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'company', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage roles
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());


-- 2. CREATE SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE 
      WHEN role = 'admin' THEN 1
      WHEN role = 'company' THEN 2
      WHEN role = 'student' THEN 3
    END
  LIMIT 1
$$;


-- 3. MIGRATE EXISTING ROLES FROM PROFILES TO USER_ROLES
-- =====================================================

INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;


-- 4. UPDATE PROFILES TABLE RLS POLICIES
-- =====================================================

-- Drop old policy that allows role changes
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- New policy: Users can update own profile BUT NOT role
CREATE POLICY "Users can update own profile except role"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Restrict SELECT to authenticated users only (fix public exposure)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- 5. UPDATE COMPANIES TABLE RLS POLICIES
-- =====================================================

-- Restrict SELECT to authenticated users only (fix public exposure)
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;

CREATE POLICY "Authenticated users can view verified companies"
  ON public.companies FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_verified = true
  );

-- Allow company owners to view their own company even if not verified
CREATE POLICY "Company owners can view their own company"
  ON public.companies FOR SELECT
  USING (profile_id = auth.uid());

-- Allow admins to view all companies
CREATE POLICY "Admins can view all companies"
  ON public.companies FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));


-- 6. ADD RLS TO ALLOWED_STUDENT_EMAILS
-- =====================================================

ALTER TABLE public.allowed_student_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Only admins can view allowed emails"
  ON public.allowed_student_emails FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert
CREATE POLICY "Only admins can add allowed emails"
  ON public.allowed_student_emails FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Only admins can update allowed emails"
  ON public.allowed_student_emails FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Only admins can delete allowed emails"
  ON public.allowed_student_emails FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));


-- 7. UPDATE ALL ADMIN-ONLY RLS POLICIES TO USE has_role()
-- =====================================================

-- Update admin_actions policies
DROP POLICY IF EXISTS "Only admins can view admin actions" ON public.admin_actions;
CREATE POLICY "Only admins can view admin actions"
  ON public.admin_actions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update event_config policies
DROP POLICY IF EXISTS "Only admins can modify event config" ON public.event_config;
CREATE POLICY "Only admins can modify event config"
  ON public.event_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update events policies
DROP POLICY IF EXISTS "Only admins can manage events" ON public.events;
CREATE POLICY "Only admins can manage events"
  ON public.events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update event_slots policies
DROP POLICY IF EXISTS "Only admins can manage event slots" ON public.event_slots;
CREATE POLICY "Only admins can manage event slots"
  ON public.event_slots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update event_participants policies
DROP POLICY IF EXISTS "Admins can manage event participants" ON public.event_participants;
CREATE POLICY "Admins can manage event participants"
  ON public.event_participants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update event_registrations policies
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.event_registrations;
CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage registrations" ON public.event_registrations;
CREATE POLICY "Admins can manage registrations"
  ON public.event_registrations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update event_time_ranges policies
DROP POLICY IF EXISTS "Admin can manage time ranges" ON public.event_time_ranges;
CREATE POLICY "Admin can manage time ranges"
  ON public.event_time_ranges FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update speed_recruiting_sessions policies
DROP POLICY IF EXISTS "Admins can manage speed recruiting sessions" ON public.speed_recruiting_sessions;
CREATE POLICY "Admins can manage speed recruiting sessions"
  ON public.speed_recruiting_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update booking_attempts policies
DROP POLICY IF EXISTS "Admins can view all booking attempts" ON public.booking_attempts;
CREATE POLICY "Admins can view all booking attempts"
  ON public.booking_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update bookings policies
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update interview_bookings policies
DROP POLICY IF EXISTS "Admins can manage all interview bookings" ON public.interview_bookings;
CREATE POLICY "Admins can manage all interview bookings"
  ON public.interview_bookings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update offers policies
DROP POLICY IF EXISTS "Admins can view all offers" ON public.offers;
CREATE POLICY "Admins can view all offers"
  ON public.offers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update companies admin policy
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));


-- 8. UPDATE STUDENT-SPECIFIC POLICIES
-- =====================================================

-- Update event_participants student view policy
DROP POLICY IF EXISTS "Students can view event participants" ON public.event_participants;
CREATE POLICY "Students can view event participants"
  ON public.event_participants FOR SELECT
  USING (public.has_role(auth.uid(), 'student'));


-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_user_role ON public.user_roles(user_id, role);


-- 10. UPDATE TRIGGER FOR NEW USER CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  company_rec record;
BEGIN
  -- Get role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create user_role entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role::text::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If company role, handle company creation/linkage
  IF user_role = 'company' THEN
    -- Check if company exists with this email
    SELECT * INTO company_rec
    FROM public.companies
    WHERE email = NEW.email
    AND profile_id IS NULL
    LIMIT 1;
    
    IF FOUND THEN
      -- Link existing company to profile
      UPDATE public.companies
      SET profile_id = NEW.id
      WHERE id = company_rec.id;
    ELSE
      -- Create new company
      INSERT INTO public.companies (profile_id, company_name, email)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name'),
        NEW.email
      )
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;


-- 11. GRANT NECESSARY PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;


-- =====================================================
-- SECURITY FIXES COMPLETE
-- =====================================================

-- Summary:
-- ✅ Created user_roles table with proper RLS
-- ✅ Created has_role() security definer function
-- ✅ Migrated existing roles from profiles to user_roles
-- ✅ Prevented users from changing their own role
-- ✅ Restricted profiles SELECT to authenticated users only
-- ✅ Restricted companies SELECT to authenticated users only
-- ✅ Added RLS to allowed_student_emails (admin-only access)
-- ✅ Updated all admin policies to use has_role() function
-- ✅ Updated trigger to create user_roles entries for new users
-- ✅ Added performance indexes