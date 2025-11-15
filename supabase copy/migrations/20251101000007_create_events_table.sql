-- Create events table for managing recruitment events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_active ON events(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);

CREATE POLICY "Only admins can manage events" ON events FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add trigger for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Modify event_slots to reference events table
ALTER TABLE event_slots DROP CONSTRAINT IF EXISTS event_slots_company_id_fkey;
ALTER TABLE event_slots DROP CONSTRAINT IF EXISTS event_slots_offer_id_fkey;

-- Add event_id column to event_slots
ALTER TABLE event_slots ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Create index for event_id
CREATE INDEX IF NOT EXISTS idx_event_slots_event ON event_slots(event_id);

-- Update RLS policies for event_slots
DROP POLICY IF EXISTS "Active slots are viewable by everyone" ON event_slots;
DROP POLICY IF EXISTS "Companies can manage their slots" ON event_slots;
DROP POLICY IF EXISTS "Admins can view all slots" ON event_slots;

CREATE POLICY "Event slots are viewable by everyone" ON event_slots FOR SELECT USING (true);

CREATE POLICY "Only admins can manage event slots" ON event_slots FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add comments
COMMENT ON TABLE events IS 'Recruitment events managed by admins';
COMMENT ON COLUMN event_slots.event_id IS 'Reference to the parent event';
