-- Migration: Add slot_time column to event_slots
-- Created: 2025-11-02
-- Description: Add missing slot_time column and fix slot generation architecture

-- Add the missing slot_time column
ALTER TABLE event_slots 
ADD COLUMN IF NOT EXISTS slot_time TIMESTAMPTZ;

-- Migrate existing data: copy start_time to slot_time for existing rows
UPDATE event_slots 
SET slot_time = start_time 
WHERE slot_time IS NULL;

-- offer_id is now nullable (slots are per company, not per offer)
-- Students book a slot and specify which offer they're interested in
ALTER TABLE event_slots 
ALTER COLUMN offer_id DROP NOT NULL;

-- company_id STAYS NOT NULL (slots are company-specific)
-- Each company has one slot per time range

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_slots_slot_time ON event_slots(slot_time);
CREATE INDEX IF NOT EXISTS idx_event_slots_event_id ON event_slots(event_id);
CREATE INDEX IF NOT EXISTS idx_event_slots_company_time ON event_slots(event_id, company_id, slot_time);

-- Add comments
COMMENT ON COLUMN event_slots.slot_time IS 'Time of the interview slot';
COMMENT ON COLUMN event_slots.company_id IS 'Company conducting interviews in this slot (NOT NULL)';
COMMENT ON COLUMN event_slots.offer_id IS 'Legacy field, now nullable. Students specify offer when booking.';
COMMENT ON COLUMN event_slots.capacity IS 'Number of simultaneous students this company can interview in this slot';
