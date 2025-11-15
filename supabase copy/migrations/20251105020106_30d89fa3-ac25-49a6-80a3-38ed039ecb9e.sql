-- Add cascade delete for event_slots when sessions are deleted
-- First, drop the existing foreign key constraint if it exists
ALTER TABLE event_slots 
DROP CONSTRAINT IF EXISTS event_slots_session_id_fkey;

-- Add the foreign key constraint with CASCADE DELETE
ALTER TABLE event_slots
ADD CONSTRAINT event_slots_session_id_fkey 
FOREIGN KEY (session_id) 
REFERENCES speed_recruiting_sessions(id) 
ON DELETE CASCADE;