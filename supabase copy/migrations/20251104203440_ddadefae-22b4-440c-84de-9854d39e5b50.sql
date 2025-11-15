-- =====================================================
-- CRITICAL SECURITY FIXES - Error Level Issues (v2)
-- Handles existing objects gracefully
-- =====================================================

-- 1. CREATE USER_ROLES TABLE IF NOT EXISTS
-- =====================================================

-- Create app_role enum (skip if exists)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'company', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table (skip if exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create policies
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());


-- 2. CREATE/REPLACE SECURITY DEFINER FUNCTIONS
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

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- New policy: Users can update own profile BUT NOT role
CREATE POLICY "Users can update own profile except role"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Restrict SELECT to authenticated users only
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- 5. UPDATE COMPANIES TABLE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view verified companies" ON public.companies;
DROP POLICY IF EXISTS "Company owners can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;

-- Authenticated users can view verified companies
CREATE POLICY "Authenticated users can view verified companies"
  ON public.companies FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_verified = true
  );

-- Company owners can view their own company even if not verified
CREATE POLICY "Company owners can view their own company"
  ON public.companies FOR SELECT
  USING (profile_id = auth.uid());

-- Admins can view and manage all companies
CREATE POLICY "Admins can view all companies"
  ON public.companies FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));


-- 6. ADD RLS TO ALLOWED_STUDENT_EMAILS
-- =====================================================

ALTER TABLE public.allowed_student_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view allowed emails" ON public.allowed_student_emails;
DROP POLICY IF EXISTS "Only admins can add allowed emails" ON public.allowed_student_emails;
DROP POLICY IF EXISTS "Only admins can update allowed emails" ON public.allowed_student_emails;
DROP POLICY IF EXISTS "Only admins can delete allowed emails" ON public.allowed_student_emails;
DROP POLICY IF EXISTS "Only admins can manage allowed emails" ON public.allowed_student_emails;

CREATE POLICY "Only admins can view allowed emails"
  ON public.allowed_student_emails FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can add allowed emails"
  ON public.allowed_student_emails FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update allowed emails"
  ON public.allowed_student_emails FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete allowed emails"
  ON public.allowed_student_emails FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));


-- 7. UPDATE ALL ADMIN-ONLY RLS POLICIES TO USE has_role()
-- =====================================================

-- admin_actions
DROP POLICY IF EXISTS "Only admins can view admin actions" ON public.admin_actions;
CREATE POLICY "Only admins can view admin actions"
  ON public.admin_actions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- event_config
DROP POLICY IF EXISTS "Only admins can modify event config" ON public.event_config;
CREATE POLICY "Only admins can modify event config"
  ON public.event_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- events
DROP POLICY IF EXISTS "Only admins can manage events" ON public.events;
CREATE POLICY "Only admins can manage events"
  ON public.events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- event_slots
DROP POLICY IF EXISTS "Only admins can manage event slots" ON public.event_slots;
CREATE POLICY "Only admins can manage event slots"
  ON public.event_slots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- event_participants
DROP POLICY IF EXISTS "Admins can manage event participants" ON public.event_participants;
CREATE POLICY "Admins can manage event participants"
  ON public.event_participants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- event_registrations
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Admins can manage registrations" ON public.event_registrations;
CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage registrations"
  ON public.event_registrations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- event_time_ranges
DROP POLICY IF EXISTS "Admin can manage time ranges" ON public.event_time_ranges;
CREATE POLICY "Admin can manage time ranges"
  ON public.event_time_ranges FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- speed_recruiting_sessions
DROP POLICY IF EXISTS "Admins can manage speed recruiting sessions" ON public.speed_recruiting_sessions;
CREATE POLICY "Admins can manage speed recruiting sessions"
  ON public.speed_recruiting_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- booking_attempts
DROP POLICY IF EXISTS "Admins can view all booking attempts" ON public.booking_attempts;
CREATE POLICY "Admins can view all booking attempts"
  ON public.booking_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- bookings
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- interview_bookings
DROP POLICY IF EXISTS "Admins can manage all interview bookings" ON public.interview_bookings;
CREATE POLICY "Admins can manage all interview bookings"
  ON public.interview_bookings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- offers
DROP POLICY IF EXISTS "Admins can view all offers" ON public.offers;
CREATE POLICY "Admins can view all offers"
  ON public.offers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- event_participants student policy
DROP POLICY IF EXISTS "Students can view event participants" ON public.event_participants;
CREATE POLICY "Students can view event participants"
  ON public.event_participants FOR SELECT
  USING (public.has_role(auth.uid(), 'student'));


-- 8. CREATE INDEXES FOR PERFORMANCE (IF NOT EXISTS)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);


-- 9. UPDATE TRIGGER FOR NEW USER CREATION
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
    SELECT * INTO company_rec
    FROM public.companies
    WHERE email = NEW.email
    AND profile_id IS NULL
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE public.companies
      SET profile_id = NEW.id
      WHERE id = company_rec.id;
    ELSE
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


-- 10. GRANT NECESSARY PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;