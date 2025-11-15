-- =====================================================
-- INF Platform 2.0 - Complete Initial Schema
-- Production-Ready with all security and performance features
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('student', 'company', 'admin');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled');
CREATE TYPE interest_tag AS ENUM ('Opérationnel', 'Administratif');
CREATE TYPE company_verification_status AS ENUM ('pending', 'verified', 'rejected');

-- =====================================================
-- TABLES
-- =====================================================

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    is_deprioritized BOOLEAN NOT NULL DEFAULT false,
    phone TEXT,
    cv_url TEXT,
    student_number TEXT UNIQUE,
    specialization TEXT,
    graduation_year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_graduation_year CHECK (graduation_year IS NULL OR (graduation_year >= 2020 AND graduation_year <= 2030)),
    CONSTRAINT student_fields_required CHECK (
        role != 'student' OR (
            student_number IS NOT NULL AND
            specialization IS NOT NULL AND
            graduation_year IS NOT NULL
        )
    )
);

-- 2. Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    logo_url TEXT,
    industry TEXT,
    company_size TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_status company_verification_status NOT NULL DEFAULT 'pending',
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_website CHECK (website IS NULL OR website ~* '^https?://'),
    CONSTRAINT verified_fields_consistent CHECK (
        (is_verified = false AND verified_by IS NULL AND verified_at IS NULL) OR
        (is_verified = true AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    )
);

-- 3. Offers
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    interest_tag interest_tag NOT NULL,
    requirements TEXT,
    duration_months INTEGER,
    location TEXT,
    remote_possible BOOLEAN DEFAULT false,
    paid BOOLEAN DEFAULT true,
    salary_range TEXT,
    skills_required TEXT[],
    benefits TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_duration CHECK (duration_months IS NULL OR (duration_months >= 1 AND duration_months <= 12))
);-- 4. Event Configuration (Single row - centralized configuration)
CREATE TABLE event_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    event_name TEXT NOT NULL DEFAULT 'Speed Recruiting Event',
    event_date DATE NOT NULL,
    event_start_time TIME NOT NULL DEFAULT '09:00:00',
    event_end_time TIME NOT NULL DEFAULT '17:00:00',
    phase1_start TIMESTAMPTZ NOT NULL,
    phase1_end TIMESTAMPTZ NOT NULL,
    phase2_start TIMESTAMPTZ NOT NULL,
    phase2_end TIMESTAMPTZ NOT NULL,
    current_phase INTEGER NOT NULL DEFAULT 0 CHECK (current_phase IN (0, 1, 2)),
    phase1_booking_limit INTEGER NOT NULL DEFAULT 3,
    phase2_booking_limit INTEGER NOT NULL DEFAULT 6,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 10,
    slot_buffer_minutes INTEGER NOT NULL DEFAULT 5,
    slot_capacity INTEGER NOT NULL DEFAULT 2,
    registration_open BOOLEAN NOT NULL DEFAULT true,
    company_registration_deadline TIMESTAMPTZ,
    student_registration_deadline TIMESTAMPTZ,
    announcement_message TEXT,
    emergency_contact_email TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_config_row CHECK (id = 1),
    CONSTRAINT valid_phase_times CHECK (
        phase1_start < phase1_end AND
        phase1_end <= phase2_start AND
        phase2_start < phase2_end
    ),
    CONSTRAINT valid_booking_limits CHECK (
        phase1_booking_limit > 0 AND
        phase2_booking_limit >= phase1_booking_limit
    ),
    CONSTRAINT valid_slot_config CHECK (
        slot_duration_minutes > 0 AND
        slot_buffer_minutes >= 0 AND
        slot_capacity > 0
    )
);

-- 5. Event Slots
CREATE TABLE event_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 2,
    location TEXT,
    room_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_capacity CHECK (capacity > 0 AND capacity <= 10)
);

-- 6. Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES event_slots(id) ON DELETE CASCADE,
    status booking_status NOT NULL DEFAULT 'confirmed',
    booking_phase INTEGER NOT NULL CHECK (booking_phase IN (1, 2)),
    student_notes TEXT,
    company_notes TEXT,
    attended BOOLEAN,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    feedback TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    CONSTRAINT unique_student_slot UNIQUE (student_id, slot_id),
    CONSTRAINT cancel_fields_consistent CHECK (
        (status = 'confirmed' AND cancelled_at IS NULL) OR
        (status = 'cancelled' AND cancelled_at IS NOT NULL)
    )
);

-- 7. Booking Attempts (Complete audit trail)
CREATE TABLE booking_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES event_slots(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    error_code TEXT,
    error_message TEXT,
    booking_phase INTEGER,
    student_booking_count INTEGER,
    slot_available_capacity INTEGER,
    ip_address INET,
    user_agent TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Admin Actions Log (Audit trail for admin actions)
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    description TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. System Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES (Performance optimization)
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_deprioritized ON profiles(is_deprioritized) WHERE is_deprioritized = true;
CREATE INDEX idx_profiles_student_number ON profiles(student_number) WHERE student_number IS NOT NULL;

-- Companies indexes
CREATE INDEX idx_companies_profile ON companies(profile_id);
CREATE INDEX idx_companies_verified ON companies(is_verified) WHERE is_verified = true;
CREATE INDEX idx_companies_verification_status ON companies(verification_status);
CREATE INDEX idx_companies_name ON companies(company_name);

-- Offers indexes
CREATE INDEX idx_offers_company ON offers(company_id);
CREATE INDEX idx_offers_tag ON offers(interest_tag);
CREATE INDEX idx_offers_active ON offers(is_active) WHERE is_active = true;
CREATE INDEX idx_offers_company_active ON offers(company_id, is_active) WHERE is_active = true;

-- Event Slots indexes
CREATE INDEX idx_slots_company ON event_slots(company_id);
CREATE INDEX idx_slots_offer ON event_slots(offer_id);
CREATE INDEX idx_slots_time ON event_slots(start_time, end_time);
CREATE INDEX idx_slots_active ON event_slots(is_active) WHERE is_active = true;
CREATE INDEX idx_slots_company_time ON event_slots(company_id, start_time);

-- Bookings indexes
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
CREATE INDEX idx_bookings_student_active ON bookings(student_id, status) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_slot_active ON bookings(slot_id, status) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_phase ON bookings(booking_phase);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- Booking Attempts indexes
CREATE INDEX idx_booking_attempts_student ON booking_attempts(student_id);
CREATE INDEX idx_booking_attempts_slot ON booking_attempts(slot_id);
CREATE INDEX idx_booking_attempts_created ON booking_attempts(created_at DESC);
CREATE INDEX idx_booking_attempts_success ON booking_attempts(success);

-- Admin Actions indexes
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies policies
CREATE POLICY "Companies are viewable by everyone" ON companies FOR SELECT USING (true);
CREATE POLICY "Company owners can update their company" ON companies FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Company owners can insert their company" ON companies FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Admins can manage all companies" ON companies FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Offers policies
CREATE POLICY "Active offers from verified companies are viewable by everyone" ON offers FOR SELECT USING (
    is_active = true AND company_id IN (SELECT id FROM companies WHERE is_verified = true)
);
CREATE POLICY "Company can manage their offers" ON offers FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
);
CREATE POLICY "Admins can view all offers" ON offers FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Event Config policies
CREATE POLICY "Event config is viewable by everyone" ON event_config FOR SELECT USING (true);
CREATE POLICY "Only admins can modify event config" ON event_config FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Event Slots policies
CREATE POLICY "Active slots are viewable by everyone" ON event_slots FOR SELECT USING (is_active = true);
CREATE POLICY "Companies can manage their slots" ON event_slots FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
);
CREATE POLICY "Admins can view all slots" ON event_slots FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bookings policies
CREATE POLICY "Students can view their bookings" ON bookings FOR SELECT USING (
    student_id = auth.uid()
);
CREATE POLICY "Companies can view bookings for their slots" ON bookings FOR SELECT USING (
    slot_id IN (
        SELECT es.id FROM event_slots es
        JOIN companies c ON c.id = es.company_id
        WHERE c.profile_id = auth.uid()
    )
);
CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Companies can update their booking notes" ON bookings FOR UPDATE USING (
    slot_id IN (
        SELECT es.id FROM event_slots es
        JOIN companies c ON c.id = es.company_id
        WHERE c.profile_id = auth.uid()
    )
);

-- Booking Attempts policies
CREATE POLICY "Users can view their booking attempts" ON booking_attempts FOR SELECT USING (
    student_id = auth.uid()
);
CREATE POLICY "Admins can view all booking attempts" ON booking_attempts FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin Actions policies
CREATE POLICY "Only admins can view admin actions" ON admin_actions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_config_updated_at BEFORE UPDATE ON event_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment offer view count
CREATE OR REPLACE FUNCTION increment_offer_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE offers SET view_count = view_count + 1 WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create notification on booking
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    slot_info RECORD;
    company_profile_id UUID;
BEGIN
    IF NEW.status = 'confirmed' THEN
        -- Get slot and company info
        SELECT es.start_time, es.end_time, c.company_name, c.profile_id, o.title
        INTO slot_info
        FROM event_slots es
        JOIN companies c ON c.id = es.company_id
        JOIN offers o ON o.id = es.offer_id
        WHERE es.id = NEW.slot_id;

        -- Notify student
        INSERT INTO notifications (user_id, title, message, type, action_url)
        VALUES (
            NEW.student_id,
            'Booking Confirmed',
            'Your interview with ' || slot_info.company_name || ' for ' || slot_info.title || ' is confirmed for ' || to_char(slot_info.start_time, 'DD/MM/YYYY HH24:MI'),
            'booking_confirmed',
            '/student/bookings'
        );

        -- Notify company
        INSERT INTO notifications (user_id, title, message, type, action_url)
        VALUES (
            slot_info.profile_id,
            'New Booking',
            'A student has booked an interview slot for ' || to_char(slot_info.start_time, 'DD/MM/YYYY HH24:MI'),
            'new_booking',
            '/company/bookings'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_booking AFTER INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION create_booking_notification();

-- =====================================================
-- MATERIALIZED VIEW for slot availability
-- =====================================================

CREATE MATERIALIZED VIEW slot_availability AS
SELECT 
    es.id as slot_id,
    es.company_id,
    es.offer_id,
    es.start_time,
    es.end_time,
    es.capacity,
    COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as booked_count,
    es.capacity - COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as available_count,
    CASE 
        WHEN COUNT(b.id) FILTER (WHERE b.status = 'confirmed') >= es.capacity THEN false
        ELSE true
    END as is_available
FROM event_slots es
LEFT JOIN bookings b ON b.slot_id = es.id
WHERE es.is_active = true
GROUP BY es.id, es.company_id, es.offer_id, es.start_time, es.end_time, es.capacity;

CREATE UNIQUE INDEX idx_slot_availability_slot_id ON slot_availability(slot_id);
CREATE INDEX idx_slot_availability_company ON slot_availability(company_id);
CREATE INDEX idx_slot_availability_available ON slot_availability(is_available) WHERE is_available = true;

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_slot_availability()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY slot_availability;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
