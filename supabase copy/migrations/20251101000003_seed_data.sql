-- =====================================================
-- INF Platform 2.0 - Complete Seed Data
-- Development and testing data
-- =====================================================

-- =====================================================
-- 1. INSERT EVENT CONFIGURATION
-- =====================================================

INSERT INTO event_config (
    id,
    event_name,
    event_date,
    event_start_time,
    event_end_time,
    phase1_start,
    phase1_end,
    phase2_start,
    phase2_end,
    current_phase,
    phase1_booking_limit,
    phase2_booking_limit,
    slot_duration_minutes,
    slot_buffer_minutes,
    slot_capacity,
    registration_open,
    announcement_message,
    emergency_contact_email,
    emergency_contact_phone
) VALUES (
    1,
    'INF Speed Recruiting 2025',
    '2025-11-20',
    '09:00:00',
    '17:00:00',
    '2025-11-15 09:00:00+00',
    '2025-11-17 23:59:59+00',
    '2025-11-18 09:00:00+00',
    '2025-11-19 23:59:59+00',
    0, -- Phase 0 (not started)
    3, -- Phase 1 limit
    6, -- Phase 2 limit
    10, -- 10 minutes per interview
    5, -- 5 minutes buffer
    2, -- 2 students per slot
    true,
    'Welcome to INF Speed Recruiting 2025! Phase 1 opens November 15th for priority students.',
    'admin@inf-platform.com',
    '+33 1 23 45 67 89'
)
ON CONFLICT (id) DO UPDATE SET
    event_name = EXCLUDED.event_name,
    event_date = EXCLUDED.event_date,
    updated_at = NOW();

-- =====================================================
-- 2. DEVELOPMENT VIEWS
-- =====================================================

CREATE OR REPLACE VIEW dev_system_stats AS
SELECT
    (SELECT COUNT(*) FROM profiles WHERE role = 'student') as total_students,
    (SELECT COUNT(*) FROM profiles WHERE role = 'student' AND is_deprioritized = true) as deprioritized_students,
    (SELECT COUNT(*) FROM profiles WHERE role = 'company') as total_companies,
    (SELECT COUNT(*) FROM companies WHERE is_verified = true) as verified_companies,
    (SELECT COUNT(*) FROM offers WHERE is_active = true) as active_offers,
    (SELECT COUNT(*) FROM event_slots WHERE is_active = true) as total_slots,
    (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') as cancelled_bookings,
    (SELECT current_phase FROM event_config WHERE id = 1) as current_phase;

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION dev_reset_bookings()
RETURNS void AS $$
BEGIN
    DELETE FROM bookings;
    DELETE FROM booking_attempts;
    RAISE NOTICE 'All bookings deleted';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION dev_get_phase_stats()
RETURNS JSON AS $$
DECLARE
    config RECORD;
    phase1_bookings INTEGER;
    phase2_bookings INTEGER;
BEGIN
    SELECT * INTO config FROM event_config WHERE id = 1;
    
    SELECT COUNT(*) INTO phase1_bookings 
    FROM bookings 
    WHERE booking_phase = 1 AND status = 'confirmed';
    
    SELECT COUNT(*) INTO phase2_bookings 
    FROM bookings 
    WHERE booking_phase = 2 AND status = 'confirmed';
    
    RETURN json_build_object(
        'current_phase', config.current_phase,
        'phase1_bookings', phase1_bookings,
        'phase2_bookings', phase2_bookings
    );
END;
$$ LANGUAGE plpgsql;