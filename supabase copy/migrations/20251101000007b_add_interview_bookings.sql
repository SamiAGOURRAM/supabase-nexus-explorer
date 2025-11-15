-- Create interview_bookings table (used by new system)
-- This table will work alongside the existing bookings table
CREATE TABLE IF NOT EXISTS interview_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES event_slots(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_interview_slot UNIQUE (student_id, slot_id)
);

-- Add indexes
CREATE INDEX idx_interview_bookings_student ON interview_bookings(student_id);
CREATE INDEX idx_interview_bookings_slot ON interview_bookings(slot_id);
CREATE INDEX idx_interview_bookings_offer ON interview_bookings(offer_id);
CREATE INDEX idx_interview_bookings_status ON interview_bookings(status);

-- Enable RLS
ALTER TABLE interview_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their interview bookings" ON interview_bookings 
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create interview bookings" ON interview_bookings 
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their interview bookings" ON interview_bookings 
    FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Companies can view bookings for their offers" ON interview_bookings 
    FOR SELECT USING (
        offer_id IN (
            SELECT o.id FROM offers o
            JOIN companies c ON c.id = o.company_id
            WHERE c.profile_id = auth.uid()
        )
    );

CREATE POLICY "Companies can update notes on their bookings" ON interview_bookings 
    FOR UPDATE USING (
        offer_id IN (
            SELECT o.id FROM offers o
            JOIN companies c ON c.id = o.company_id
            WHERE c.profile_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all interview bookings" ON interview_bookings 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Add trigger for updated_at
CREATE TRIGGER update_interview_bookings_updated_at BEFORE UPDATE ON interview_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE interview_bookings IS 'Interview bookings connecting students, slots, and offers';
COMMENT ON COLUMN interview_bookings.student_id IS 'Student who made the booking';
COMMENT ON COLUMN interview_bookings.slot_id IS 'Time slot for the interview';
COMMENT ON COLUMN interview_bookings.offer_id IS 'Job offer being interviewed for';
