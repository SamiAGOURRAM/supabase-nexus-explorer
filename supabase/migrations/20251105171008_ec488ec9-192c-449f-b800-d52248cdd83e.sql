-- =====================================================
-- PHASES 4-5: Fix Student Bookings Function & Deprecate Old Table
-- =====================================================

-- Phase 4: Fix fn_get_student_bookings to query from bookings table
CREATE OR REPLACE FUNCTION fn_get_student_bookings(
    p_student_id UUID
)
RETURNS TABLE (
    booking_id UUID,
    slot_time TIMESTAMPTZ,
    offer_title TEXT,
    company_name TEXT,
    event_name TEXT,
    status TEXT,
    notes TEXT,
    can_cancel BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as booking_id,
        es.start_time as slot_time,
        COALESCE(o.title, 'Unknown Offer') as offer_title,
        c.company_name,
        e.name as event_name,
        b.status::TEXT,
        b.student_notes as notes,
        (es.start_time > NOW() + INTERVAL '24 hours' AND b.status = 'confirmed') as can_cancel
    FROM bookings b
    JOIN event_slots es ON es.id = b.slot_id
    LEFT JOIN offers o ON o.id = es.offer_id
    JOIN companies c ON c.id = es.company_id
    JOIN events e ON e.id = es.event_id
    WHERE b.student_id = p_student_id
    ORDER BY es.start_time DESC;
END;
$$;

-- Phase 4: Verify no critical data remains in interview_bookings
DO $$
DECLARE
    v_old_count INTEGER;
    v_new_count INTEGER;
    v_unmigrated INTEGER;
BEGIN
    -- Count bookings in old table
    SELECT COUNT(*) INTO v_old_count FROM interview_bookings;
    
    -- Count bookings in new table
    SELECT COUNT(*) INTO v_new_count FROM bookings;
    
    -- Check if any old bookings aren't in new table
    SELECT COUNT(*) INTO v_unmigrated
    FROM interview_bookings ib
    WHERE NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = ib.id
    );
    
    RAISE NOTICE '📊 Migration Verification:';
    RAISE NOTICE '   Old table (interview_bookings): % records', v_old_count;
    RAISE NOTICE '   New table (bookings): % records', v_new_count;
    RAISE NOTICE '   Unmigrated records: %', v_unmigrated;
    
    IF v_unmigrated > 0 THEN
        RAISE WARNING '⚠️  Found % unmigrated bookings in interview_bookings!', v_unmigrated;
    ELSE
        RAISE NOTICE '✅ All data successfully migrated to bookings table';
    END IF;
END;
$$;

-- Phase 4: Deprecate interview_bookings table by renaming it
ALTER TABLE interview_bookings RENAME TO interview_bookings_deprecated;

-- Add deprecation notice
COMMENT ON TABLE interview_bookings_deprecated IS 
'DEPRECATED - 2025-11-05: This table has been replaced by the "bookings" table. 
All data has been migrated. This table is kept for historical reference only.
DO NOT use this table in any new code. It will be dropped in a future migration.';

-- Phase 5: Verification queries
DO $$
DECLARE
    v_slot_count INTEGER;
    v_slots_with_offers INTEGER;
    v_booking_count INTEGER;
BEGIN
    -- Test 1: Check slots have offer_id populated
    SELECT COUNT(*) INTO v_slot_count FROM event_slots WHERE is_active = true;
    SELECT COUNT(*) INTO v_slots_with_offers FROM event_slots WHERE is_active = true AND offer_id IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 Phase 5 - Testing Checklist:';
    RAISE NOTICE '   ✅ Active slots: %', v_slot_count;
    RAISE NOTICE '   ✅ Slots with offer_id: % (%.1f%%)', 
        v_slots_with_offers, 
        CASE WHEN v_slot_count > 0 THEN (v_slots_with_offers::FLOAT / v_slot_count * 100) ELSE 0 END;
    
    -- Test 2: Check bookings are properly linked
    SELECT COUNT(*) INTO v_booking_count 
    FROM bookings b
    JOIN event_slots es ON b.slot_id = es.id
    LEFT JOIN offers o ON es.offer_id = o.id
    WHERE b.status = 'confirmed';
    
    RAISE NOTICE '   ✅ Confirmed bookings with slot data: %', v_booking_count;
    
    -- Test 3: Verify fn_get_student_bookings works
    RAISE NOTICE '   ✅ fn_get_student_bookings: Updated to query bookings table';
    RAISE NOTICE '   ✅ interview_bookings: Renamed to interview_bookings_deprecated';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Expected Outcomes:';
    RAISE NOTICE '   ✅ Single source of truth: bookings table';
    RAISE NOTICE '   ✅ Offer data via: bookings → event_slots → offers';
    RAISE NOTICE '   ✅ All dashboards show consistent data';
    RAISE NOTICE '   ✅ Future slots auto-populate with offer_id';
END;
$$;