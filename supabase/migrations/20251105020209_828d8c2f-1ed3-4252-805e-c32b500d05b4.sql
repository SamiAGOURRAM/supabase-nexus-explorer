-- Add cascade delete for interview_bookings when slots are deleted
-- First, drop the existing foreign key constraint if it exists
ALTER TABLE interview_bookings 
DROP CONSTRAINT IF EXISTS interview_bookings_slot_id_fkey;

-- Add the foreign key constraint with CASCADE DELETE
ALTER TABLE interview_bookings
ADD CONSTRAINT interview_bookings_slot_id_fkey 
FOREIGN KEY (slot_id) 
REFERENCES event_slots(id) 
ON DELETE CASCADE;