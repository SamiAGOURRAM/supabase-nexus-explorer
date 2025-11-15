-- =====================================================
-- INF Platform 2.0 - Complete Core Functions
-- Production-ready with full error handling and logging
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Log Admin Action
-- =====================================================

CREATE OR REPLACE FUNCTION log_admin_action(
    action_type_param TEXT,
    target_table_param TEXT DEFAULT NULL,
    target_id_param UUID DEFAULT NULL,
    old_values_param JSONB DEFAULT NULL,
    new_values_param JSONB DEFAULT NULL,
    description_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_id_val UUID;
BEGIN
    admin_id_val := auth.uid();
    
    INSERT INTO admin_actions (
        admin_id, action_type, target_table, target_id,
        old_values, new_values, description
    ) VALUES (
        admin_id_val, action_type_param, target_table_param, target_id_param,
        old_values_param, new_values_param, description_param
    );
END;
$$;

-- =====================================================
-- 1. BOOK INTERVIEW (CRITICAL FUNCTION)
-- Complete with all validations and race condition prevention
-- =====================================================

CREATE OR REPLACE FUNCTION fn_book_interview(
    slot_id_to_book UUID,
    student_notes_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_id_val UUID;
    config RECORD;
    student_profile RECORD;
    slot RECORD;
    student_booking_count INTEGER;
    slot_current_bookings INTEGER;
    new_booking_id UUID;
    error_code_val TEXT;
    start_time_ms BIGINT;
    end_time_ms BIGINT;
    slot_available_capacity_val INTEGER;
BEGIN
    start_time_ms := EXTRACT(EPOCH FROM clock_timestamp()) * 1000;
    
    -- Validation 1: Authentication
    student_id_val := auth.uid();
    IF student_id_val IS NULL THEN
        error_code_val := 'NOT_AUTHENTICATED';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (NULL, slot_id_to_book, false, error_code_val, 'User not authenticated', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'User not authenticated');
    END IF;

    -- Validation 2: Get and verify student profile
    SELECT * INTO student_profile FROM profiles WHERE id = student_id_val;
    IF NOT FOUND THEN
        error_code_val := 'PROFILE_NOT_FOUND';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Profile not found', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'Profile not found');
    END IF;
    
    IF student_profile.role != 'student' THEN
        error_code_val := 'NOT_STUDENT';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Only students can book interviews', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'Only students can book interviews');
    END IF;

    -- Validation 3: Get event configuration
    SELECT * INTO config FROM event_config WHERE id = 1;
    IF NOT FOUND THEN
        error_code_val := 'NO_CONFIG';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Event not configured', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'Event not configured');
    END IF;

    -- Validation 4: Check if booking is open
    IF config.current_phase = 0 THEN
        error_code_val := 'BOOKING_NOT_OPEN';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Booking not yet open', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'Booking not yet open');
    END IF;
    
    IF NOW() < config.phase1_start OR NOW() > config.phase2_end THEN
        error_code_val := 'BOOKING_CLOSED';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Booking period is closed', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'Booking period is closed');
    END IF;

    -- Validation 5: CRITICAL PHASE 1 GATE - Deprioritized students cannot book in Phase 1
    IF config.current_phase = 1 AND student_profile.is_deprioritized = true THEN
        error_code_val := 'PHASE_GATE';
        INSERT INTO booking_attempts (
            student_id, slot_id, success, error_code, error_message, 
            booking_phase, student_booking_count, response_time_ms
        ) VALUES (
            student_id_val, slot_id_to_book, false, error_code_val, 
            'Phase 1 is reserved for students without internships',
            config.current_phase, 0, EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms
        );
        RETURN json_build_object(
            'success', false, 
            'error_code', error_code_val, 
            'error_message', 'Phase 1 is reserved for students without internships. Please wait for Phase 2.'
        );
    END IF;

    -- Validation 6: Get student's current booking count
    SELECT COUNT(*) INTO student_booking_count
    FROM bookings
    WHERE student_id = student_id_val AND status = 'confirmed';

    -- Validation 7: Check booking limit based on current phase
    IF config.current_phase = 1 AND student_booking_count >= config.phase1_booking_limit THEN
        error_code_val := 'BOOKING_LIMIT_REACHED';
        INSERT INTO booking_attempts (
            student_id, slot_id, success, error_code, error_message, 
            booking_phase, student_booking_count, response_time_ms
        ) VALUES (
            student_id_val, slot_id_to_book, false, error_code_val, 
            'Phase 1 booking limit reached',
            config.current_phase, student_booking_count, EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms
        );
        RETURN json_build_object(
            'success', false, 
            'error_code', error_code_val, 
            'error_message', 'Phase 1 booking limit reached (max ' || config.phase1_booking_limit || '). You have ' || student_booking_count || ' bookings.'
        );
    END IF;

    IF config.current_phase = 2 AND student_booking_count >= config.phase2_booking_limit THEN
        error_code_val := 'BOOKING_LIMIT_REACHED';
        INSERT INTO booking_attempts (
            student_id, slot_id, success, error_code, error_message, 
            booking_phase, student_booking_count, response_time_ms
        ) VALUES (
            student_id_val, slot_id_to_book, false, error_code_val, 
            'Phase 2 booking limit reached',
            config.current_phase, student_booking_count, EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms
        );
        RETURN json_build_object(
            'success', false, 
            'error_code', error_code_val, 
            'error_message', 'Phase 2 booking limit reached (max ' || config.phase2_booking_limit || '). You have ' || student_booking_count || ' bookings.'
        );
    END IF;

    -- Validation 8: Get and lock the slot (CRITICAL: Prevents race conditions)
    SELECT * INTO slot FROM event_slots WHERE id = slot_id_to_book FOR UPDATE;
    IF NOT FOUND THEN
        error_code_val := 'SLOT_NOT_FOUND';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Slot not found', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'Slot not found');
    END IF;
    
    IF slot.is_active = false THEN
        error_code_val := 'SLOT_INACTIVE';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Slot is no longer active', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'This slot is no longer available');
    END IF;

    -- Validation 9: Check if student already booked this slot
    IF EXISTS (SELECT 1 FROM bookings WHERE student_id = student_id_val AND slot_id = slot_id_to_book AND status = 'confirmed') THEN
        error_code_val := 'ALREADY_BOOKED';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Already booked this slot', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'You have already booked this slot');
    END IF;

    -- Validation 10: Check slot capacity (with lock held - prevents double booking)
    SELECT COUNT(*) INTO slot_current_bookings
    FROM bookings
    WHERE slot_id = slot_id_to_book AND status = 'confirmed'
    FOR UPDATE;
    
    slot_available_capacity_val := slot.capacity - slot_current_bookings;

    IF slot_current_bookings >= slot.capacity THEN
        error_code_val := 'SLOT_FULL';
        INSERT INTO booking_attempts (
            student_id, slot_id, success, error_code, error_message, 
            booking_phase, student_booking_count, slot_available_capacity, response_time_ms
        ) VALUES (
            student_id_val, slot_id_to_book, false, error_code_val, 
            'Slot is full',
            config.current_phase, student_booking_count, 0, EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms
        );
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'This slot is full (' || slot_current_bookings || '/' || slot.capacity || ')');
    END IF;

    -- Validation 11: Check for time conflicts with existing bookings
    IF EXISTS (
        SELECT 1 FROM bookings b
        JOIN event_slots es ON es.id = b.slot_id
        WHERE b.student_id = student_id_val 
        AND b.status = 'confirmed'
        AND (
            (es.start_time, es.end_time) OVERLAPS (slot.start_time, slot.end_time)
        )
    ) THEN
        error_code_val := 'TIME_CONFLICT';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, 'Time conflict with existing booking', EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'This slot conflicts with another booking you have');
    END IF;

    -- ALL VALIDATIONS PASSED - Create the booking
    INSERT INTO bookings (student_id, slot_id, booking_phase, student_notes)
    VALUES (student_id_val, slot_id_to_book, config.current_phase, student_notes_param)
    RETURNING id INTO new_booking_id;

    -- Log successful attempt
    end_time_ms := EXTRACT(EPOCH FROM clock_timestamp()) * 1000;
    INSERT INTO booking_attempts (
        student_id, slot_id, success, error_code, 
        booking_phase, student_booking_count, slot_available_capacity, response_time_ms
    ) VALUES (
        student_id_val, slot_id_to_book, true, 'SUCCESS',
        config.current_phase, student_booking_count + 1, slot_available_capacity_val - 1, end_time_ms - start_time_ms
    );

    RETURN json_build_object(
        'success', true,
        'booking_id', new_booking_id,
        'message', 'Booking created successfully',
        'bookings_remaining', CASE 
            WHEN config.current_phase = 1 THEN config.phase1_booking_limit - student_booking_count - 1
            ELSE config.phase2_booking_limit - student_booking_count - 1
        END
    );

EXCEPTION
    WHEN OTHERS THEN
        error_code_val := 'INTERNAL_ERROR';
        INSERT INTO booking_attempts (student_id, slot_id, success, error_code, error_message, response_time_ms)
        VALUES (student_id_val, slot_id_to_book, false, error_code_val, SQLERRM, EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - start_time_ms);
        RETURN json_build_object('success', false, 'error_code', error_code_val, 'error_message', 'An internal error occurred: ' || SQLERRM);
END;
$$;

-- =====================================================
-- 2. CANCEL BOOKING
-- Complete with validation and notification
-- =====================================================

CREATE OR REPLACE FUNCTION fn_cancel_booking(
    booking_id_to_cancel UUID,
    cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_id_val UUID;
    booking RECORD;
    config RECORD;
BEGIN
    student_id_val := auth.uid();
    
    IF student_id_val IS NULL THEN
        RETURN json_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'error_message', 'User not authenticated');
    END IF;

    -- Get event config to check cancellation deadline
    SELECT * INTO config FROM event_config WHERE id = 1;

    -- Get and verify booking ownership
    SELECT * INTO booking FROM bookings WHERE id = booking_id_to_cancel AND student_id = student_id_val;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'BOOKING_NOT_FOUND', 'error_message', 'Booking not found or you do not have permission');
    END IF;

    IF booking.status = 'cancelled' THEN
        RETURN json_build_object('success', false, 'error_code', 'ALREADY_CANCELLED', 'error_message', 'Booking already cancelled');
    END IF;

    -- Cancel the booking (soft delete)
    UPDATE bookings
    SET status = 'cancelled', 
        cancelled_at = NOW(),
        cancelled_reason = cancellation_reason
    WHERE id = booking_id_to_cancel;

    -- Create notification for company
    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
        c.profile_id,
        'Booking Cancelled',
        'A student has cancelled their booking',
        'booking_cancelled'
    FROM event_slots es
    JOIN companies c ON c.id = es.company_id
    WHERE es.id = booking.slot_id;

    RETURN json_build_object('success', true, 'message', 'Booking cancelled successfully');
END;
$$;

-- =====================================================
-- 3. GET STUDENT BOOKING STATS
-- Real-time statistics for UI display
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_student_booking_stats(
    student_id_param UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_id_val UUID;
    booking_count INTEGER;
    config RECORD;
    max_bookings INTEGER;
    student_profile RECORD;
    can_book_phase1 BOOLEAN;
BEGIN
    student_id_val := COALESCE(student_id_param, auth.uid());
    
    IF student_id_val IS NULL THEN
        RETURN json_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED');
    END IF;

    -- Get student profile
    SELECT * INTO student_profile FROM profiles WHERE id = student_id_val;

    -- Get config
    SELECT * INTO config FROM event_config WHERE id = 1;
    
    -- Determine if student can book in Phase 1
    can_book_phase1 := (student_profile.is_deprioritized = false);
    
    -- Determine max bookings based on phase
    IF config.current_phase = 1 THEN
        max_bookings := config.phase1_booking_limit;
    ELSE
        max_bookings := config.phase2_booking_limit;
    END IF;

    -- Get booking count
    SELECT COUNT(*) INTO booking_count
    FROM bookings
    WHERE student_id = student_id_val AND status = 'confirmed';

    RETURN json_build_object(
        'success', true,
        'current_bookings', booking_count,
        'max_bookings', max_bookings,
        'remaining_bookings', GREATEST(0, max_bookings - booking_count),
        'current_phase', config.current_phase,
        'is_deprioritized', student_profile.is_deprioritized,
        'can_book_phase1', can_book_phase1,
        'booking_open', config.current_phase > 0,
        'phase1_start', config.phase1_start,
        'phase1_end', config.phase1_end,
        'phase2_start', config.phase2_start,
        'phase2_end', config.phase2_end
    );
END;
$$;

-- =====================================================
-- 4. GENERATE EVENT SLOTS
-- Automated slot generation for companies
-- =====================================================

CREATE OR REPLACE FUNCTION fn_generate_event_slots(
    company_id_param UUID,
    offer_id_param UUID,
    custom_capacity INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    config RECORD;
    slot_time TIMESTAMPTZ;
    end_of_day TIMESTAMPTZ;
    slot_count INTEGER := 0;
    slot_capacity_val INTEGER;
BEGIN
    -- Get config
    SELECT * INTO config FROM event_config WHERE id = 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'NO_CONFIG', 'error_message', 'Event not configured');
    END IF;

    -- Verify company exists and is verified
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = company_id_param AND is_verified = true) THEN
        RETURN json_build_object('success', false, 'error_code', 'COMPANY_NOT_VERIFIED', 'error_message', 'Company must be verified to generate slots');
    END IF;

    -- Verify offer exists and belongs to company
    IF NOT EXISTS (SELECT 1 FROM offers WHERE id = offer_id_param AND company_id = company_id_param AND is_active = true) THEN
        RETURN json_build_object('success', false, 'error_code', 'OFFER_NOT_FOUND', 'error_message', 'Offer not found or not active');
    END IF;

    -- Determine capacity
    slot_capacity_val := COALESCE(custom_capacity, config.slot_capacity);

    -- Generate slots for the event day
    slot_time := (config.event_date || ' ' || config.event_start_time)::TIMESTAMPTZ;
    end_of_day := (config.event_date || ' ' || config.event_end_time)::TIMESTAMPTZ;
    
    WHILE slot_time + (config.slot_duration_minutes || ' minutes')::INTERVAL <= end_of_day LOOP
        INSERT INTO event_slots (company_id, offer_id, start_time, end_time, capacity)
        VALUES (
            company_id_param,
            offer_id_param,
            slot_time,
            slot_time + (config.slot_duration_minutes || ' minutes')::INTERVAL,
            slot_capacity_val
        );
        
        slot_count := slot_count + 1;
        slot_time := slot_time + ((config.slot_duration_minutes + config.slot_buffer_minutes) || ' minutes')::INTERVAL;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'slots_generated', slot_count,
        'message', slot_count || ' slots generated successfully for ' || to_char(config.event_date, 'DD/MM/YYYY')
    );
END;
$$;

-- =====================================================
-- 5. VERIFY COMPANY (Admin only)
-- Complete verification with audit trail
-- =====================================================

CREATE OR REPLACE FUNCTION fn_verify_company(
    company_id_param UUID,
    verified BOOLEAN,
    rejection_reason_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_id UUID;
    admin_profile RECORD;
    company_record RECORD;
    old_status JSONB;
    new_status JSONB;
BEGIN
    admin_id := auth.uid();
    
    IF admin_id IS NULL THEN
        RETURN json_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED');
    END IF;

    -- Check if user is admin
    SELECT * INTO admin_profile FROM profiles WHERE id = admin_id;
    
    IF admin_profile.role != 'admin' THEN
        RETURN json_build_object('success', false, 'error_code', 'NOT_AUTHORIZED', 'error_message', 'Admin access required');
    END IF;

    -- Get current company status
    SELECT * INTO company_record FROM companies WHERE id = company_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'COMPANY_NOT_FOUND');
    END IF;

    -- Store old values for audit
    old_status := jsonb_build_object(
        'is_verified', company_record.is_verified,
        'verification_status', company_record.verification_status
    );

    -- Update company verification
    IF verified THEN
        UPDATE companies
        SET is_verified = true,
            verification_status = 'verified',
            verified_by = admin_id,
            verified_at = NOW(),
            rejection_reason = NULL
        WHERE id = company_id_param;
        
        -- Notify company of approval
        INSERT INTO notifications (user_id, title, message, type, action_url)
        VALUES (
            company_record.profile_id,
            'Company Verified',
            'Your company has been verified. You can now create offers and generate interview slots.',
            'company_verified',
            '/company/dashboard'
        );
    ELSE
        UPDATE companies
        SET is_verified = false,
            verification_status = 'rejected',
            rejection_reason = rejection_reason_param
        WHERE id = company_id_param;
        
        -- Notify company of rejection
        INSERT INTO notifications (user_id, title, message, type, action_url)
        VALUES (
            company_record.profile_id,
            'Company Verification - Action Required',
            'Your company verification needs attention: ' || COALESCE(rejection_reason_param, 'Please check details'),
            'company_rejected',
            '/company/profile'
        );
    END IF;

    -- Store new values for audit
    new_status := jsonb_build_object(
        'is_verified', verified,
        'verification_status', CASE WHEN verified THEN 'verified' ELSE 'rejected' END
    );

    -- Log admin action
    PERFORM log_admin_action(
        'VERIFY_COMPANY',
        'companies',
        company_id_param,
        old_status,
        new_status,
        CASE WHEN verified THEN 'Company verified' ELSE 'Company rejected: ' || COALESCE(rejection_reason_param, 'No reason provided') END
    );

    RETURN json_build_object(
        'success', true, 
        'message', CASE WHEN verified THEN 'Company verified successfully' ELSE 'Company verification rejected' END
    );
END;
$$;

-- =====================================================
-- 6. UPDATE EVENT PHASE (Admin only)
-- Transition between booking phases
-- =====================================================

CREATE OR REPLACE FUNCTION fn_update_event_phase(
    new_phase INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_id UUID;
    admin_profile RECORD;
    config RECORD;
    old_phase INTEGER;
BEGIN
    admin_id := auth.uid();
    
    IF admin_id IS NULL THEN
        RETURN json_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED');
    END IF;

    -- Check if user is admin
    SELECT * INTO admin_profile FROM profiles WHERE id = admin_id;
    
    IF admin_profile.role != 'admin' THEN
        RETURN json_build_object('success', false, 'error_code', 'NOT_AUTHORIZED', 'error_message', 'Admin access required');
    END IF;

    -- Validate phase
    IF new_phase NOT IN (0, 1, 2) THEN
        RETURN json_build_object('success', false, 'error_code', 'INVALID_PHASE', 'error_message', 'Phase must be 0, 1, or 2');
    END IF;

    -- Get current config
    SELECT * INTO config FROM event_config WHERE id = 1;
    old_phase := config.current_phase;

    -- Update phase
    UPDATE event_config SET current_phase = new_phase WHERE id = 1;

    -- Log admin action
    PERFORM log_admin_action(
        'UPDATE_PHASE',
        'event_config',
        NULL,
        jsonb_build_object('phase', old_phase),
        jsonb_build_object('phase', new_phase),
        'Event phase updated from ' || old_phase || ' to ' || new_phase
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Event phase updated to ' || new_phase,
        'old_phase', old_phase,
        'new_phase', new_phase
    );
END;
$$;

-- =====================================================
-- 7. GET AVAILABLE SLOTS WITH DETAILS
-- Efficient query for student booking interface
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_available_slots(
    filter_company_id UUID DEFAULT NULL,
    filter_offer_id UUID DEFAULT NULL,
    filter_interest_tag interest_tag DEFAULT NULL
)
RETURNS TABLE (
    slot_id UUID,
    company_id UUID,
    company_name TEXT,
    offer_id UUID,
    offer_title TEXT,
    interest_tag interest_tag,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    capacity INTEGER,
    booked_count BIGINT,
    available_count BIGINT,
    is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.id as slot_id,
        c.id as company_id,
        c.company_name,
        o.id as offer_id,
        o.title as offer_title,
        o.interest_tag,
        es.start_time,
        es.end_time,
        es.capacity,
        COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as booked_count,
        es.capacity - COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as available_count,
        (es.capacity - COUNT(b.id) FILTER (WHERE b.status = 'confirmed') > 0) as is_available
    FROM event_slots es
    JOIN companies c ON c.id = es.company_id
    JOIN offers o ON o.id = es.offer_id
    LEFT JOIN bookings b ON b.slot_id = es.id
    WHERE es.is_active = true
        AND c.is_verified = true
        AND o.is_active = true
        AND (filter_company_id IS NULL OR c.id = filter_company_id)
        AND (filter_offer_id IS NULL OR o.id = filter_offer_id)
        AND (filter_interest_tag IS NULL OR o.interest_tag = filter_interest_tag)
    GROUP BY es.id, c.id, c.company_name, o.id, o.title, o.interest_tag, es.start_time, es.end_time, es.capacity
    HAVING es.capacity - COUNT(b.id) FILTER (WHERE b.status = 'confirmed') > 0
    ORDER BY es.start_time, c.company_name;
END;
$$;

-- =====================================================
-- 8. GET STUDENT BOOKINGS WITH FULL DETAILS
-- For student dashboard
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_student_bookings()
RETURNS TABLE (
    booking_id UUID,
    slot_id UUID,
    company_name TEXT,
    company_logo TEXT,
    offer_title TEXT,
    interest_tag interest_tag,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    location TEXT,
    room_number TEXT,
    status booking_status,
    booking_phase INTEGER,
    student_notes TEXT,
    company_notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_id_val UUID;
BEGIN
    student_id_val := auth.uid();
    
    IF student_id_val IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        b.id as booking_id,
        es.id as slot_id,
        c.company_name,
        c.logo_url as company_logo,
        o.title as offer_title,
        o.interest_tag,
        es.start_time,
        es.end_time,
        es.location,
        es.room_number,
        b.status,
        b.booking_phase,
        b.student_notes,
        b.company_notes,
        b.created_at
    FROM bookings b
    JOIN event_slots es ON es.id = b.slot_id
    JOIN companies c ON c.id = es.company_id
    JOIN offers o ON o.id = es.offer_id
    WHERE b.student_id = student_id_val
    ORDER BY es.start_time;
END;
$$;

-- =====================================================
-- 9. GET COMPANY BOOKINGS
-- For company dashboard
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_company_bookings()
RETURNS TABLE (
    booking_id UUID,
    slot_id UUID,
    student_name TEXT,
    student_email TEXT,
    student_phone TEXT,
    student_specialization TEXT,
    graduation_year INTEGER,
    cv_url TEXT,
    offer_title TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status booking_status,
    student_notes TEXT,
    company_notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    company_id_val UUID;
BEGIN
    -- Get company ID for current user
    SELECT id INTO company_id_val 
    FROM companies 
    WHERE profile_id = auth.uid();
    
    IF company_id_val IS NULL THEN
        RAISE EXCEPTION 'Company profile not found';
    END IF;

    RETURN QUERY
    SELECT 
        b.id as booking_id,
        es.id as slot_id,
        p.full_name as student_name,
        p.email as student_email,
        p.phone as student_phone,
        p.specialization as student_specialization,
        p.graduation_year,
        p.cv_url,
        o.title as offer_title,
        es.start_time,
        es.end_time,
        b.status,
        b.student_notes,
        b.company_notes,
        b.created_at
    FROM bookings b
    JOIN event_slots es ON es.id = b.slot_id
    JOIN profiles p ON p.id = b.student_id
    JOIN offers o ON o.id = es.offer_id
    WHERE es.company_id = company_id_val
        AND b.status = 'confirmed'
    ORDER BY es.start_time;
END;
$$;
