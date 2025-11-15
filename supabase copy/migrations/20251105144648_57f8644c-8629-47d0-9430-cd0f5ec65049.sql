-- Phase 1: Update existing offers to have an event_id
-- Set event_id to the most recent active event for offers that don't have one
UPDATE offers 
SET event_id = (
  SELECT id FROM events 
  WHERE is_active = true 
  ORDER BY date DESC 
  LIMIT 1
)
WHERE event_id IS NULL;

-- Phase 2: Make event_id required for all future offers
ALTER TABLE offers 
  ALTER COLUMN event_id SET NOT NULL;

-- Phase 3: Make event_slots.offer_id nullable (slots are company-level, not offer-specific)
ALTER TABLE event_slots 
  ALTER COLUMN offer_id DROP NOT NULL;

-- Add explanatory comment
COMMENT ON COLUMN event_slots.offer_id IS 'DEPRECATED - Slots are company availability windows assigned by admin, not tied to specific offers. Students book company slots and can discuss any of the company''s offers during that time.';

-- Phase 4: Make interview_bookings.offer_id nullable (optional interest indicator)
ALTER TABLE interview_bookings 
  ALTER COLUMN offer_id DROP NOT NULL;

COMMENT ON COLUMN interview_bookings.offer_id IS 'Optional - Indicates which offer sparked the student''s interest, but the booking is for the company''s time slot where any offer can be discussed.';