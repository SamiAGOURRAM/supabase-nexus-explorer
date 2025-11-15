-- Migrate data from interview_bookings to bookings table
-- Use a simple INSERT that will work with existing triggers

DO $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Loop through interview_bookings and insert one by one
  FOR booking_record IN 
    SELECT 
      ib.id,
      ib.student_id,
      ib.slot_id,
      ib.status,
      ib.created_at,
      ib.updated_at,
      ib.notes,
      COALESCE(
        (
          SELECT 
            CASE 
              WHEN ib.created_at < e.phase1_end_date THEN 1
              WHEN ib.created_at >= e.phase2_start_date THEN 2
              ELSE 1
            END
          FROM event_slots es
          JOIN events e ON es.event_id = e.id
          WHERE es.id = ib.slot_id
          LIMIT 1
        ),
        1
      ) as booking_phase
    FROM interview_bookings ib
    WHERE NOT EXISTS (
      SELECT 1 FROM bookings b WHERE b.id = ib.id
    )
  LOOP
    BEGIN
      INSERT INTO bookings (
        id,
        student_id,
        slot_id,
        status,
        booking_phase,
        created_at,
        cancelled_at,
        student_notes
      ) VALUES (
        booking_record.id,
        booking_record.student_id,
        booking_record.slot_id,
        booking_record.status::booking_status,
        booking_record.booking_phase,
        booking_record.created_at,
        CASE WHEN booking_record.status = 'cancelled' THEN booking_record.updated_at ELSE NULL END,
        booking_record.notes
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip records that cause errors (likely due to missing related data)
        RAISE NOTICE 'Skipped booking % due to error: %', booking_record.id, SQLERRM;
    END;
  END LOOP;
END $$;