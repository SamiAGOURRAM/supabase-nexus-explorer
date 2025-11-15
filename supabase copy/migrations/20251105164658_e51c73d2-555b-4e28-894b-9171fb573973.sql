-- Fix the notification trigger to handle NULL values
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    slot_info RECORD;
BEGIN
    -- Get slot details
    SELECT 
        es.start_time,
        c.company_name,
        o.title
    INTO slot_info
    FROM event_slots es
    LEFT JOIN companies c ON c.id = es.company_id
    LEFT JOIN offers o ON o.id = es.offer_id
    WHERE es.id = NEW.slot_id;

    -- Only create notification if we have the necessary data
    IF slot_info.company_name IS NOT NULL AND slot_info.title IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, action_url)
        VALUES (
            NEW.student_id,
            'Booking Confirmed',
            'Your interview with ' || slot_info.company_name || ' for ' || slot_info.title || ' is confirmed for ' || to_char(slot_info.start_time, 'DD/MM/YYYY HH24:MI'),
            'booking_confirmed',
            '/student/bookings'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now migrate the booking
DO $$ 
DECLARE
  v_current_phase int := 1;
BEGIN
  -- Insert the booking
  INSERT INTO public.bookings (
    id,
    student_id,
    slot_id,
    status,
    booking_phase,
    created_at,
    student_notes
  )
  SELECT 
    ib.id,
    ib.student_id,
    ib.slot_id,
    'confirmed'::booking_status,
    v_current_phase,
    ib.created_at,
    ib.notes
  FROM interview_bookings ib
  WHERE ib.id = '4648cd70-c847-4e38-980d-479989897c3a'::uuid
    AND NOT EXISTS (SELECT 1 FROM bookings WHERE id = ib.id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Successfully migrated booking';
END $$;