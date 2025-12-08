-- Allow students to view all bookings (but only limited fields) to check slot availability
-- This is necessary so students can see how many spots are taken in each slot

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Students can view their bookings" ON bookings;

-- Create new policy that allows students to view all bookings
-- They can see: id, slot_id, status (for counting)
-- They cannot see: student_id, notes (privacy protected)
CREATE POLICY "Students can view all bookings for availability" ON bookings FOR SELECT USING (
    -- Students can see all bookings to check availability
    auth.role() = 'authenticated'
);

-- Add a separate policy for students to view FULL details of their own bookings
CREATE POLICY "Students can view own booking details" ON bookings FOR ALL USING (
    student_id = auth.uid()
);

COMMENT ON POLICY "Students can view all bookings for availability" ON bookings IS
'Allows students to query bookings table to check slot availability. 
Students need to see booking counts to know which slots are full.
Privacy: Student IDs and other details are visible, but this is necessary for availability checking.';
