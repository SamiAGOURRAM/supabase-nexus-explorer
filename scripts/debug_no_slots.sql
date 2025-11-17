-- Debug why "No Available Slots" appears when trying to book an interview
-- Run this to diagnose the slot availability issue

-- 1. Check if the offer exists and is active
SELECT 
    o.id as offer_id,
    o.title,
    o.is_active,
    o.event_id,
    o.company_id,
    c.company_name,
    c.is_verified,
    e.name as event_name
FROM offers o
JOIN companies c ON c.id = o.company_id
LEFT JOIN events e ON e.id = o.event_id
WHERE o.title ILIKE '%3bid%' OR o.title ILIKE '%v2.1%'
ORDER BY o.created_at DESC
LIMIT 5;

-- 2. Check if ANY slots exist for this company
SELECT 
    es.id as slot_id,
    es.company_id,
    es.offer_id,
    es.start_time,
    es.end_time,
    es.capacity,
    es.is_active,
    es.event_id,
    c.company_name,
    o.title as offer_title,
    CASE 
        WHEN es.start_time < NOW() THEN '❌ Slot is in the past'
        WHEN es.is_active = false THEN '❌ Slot is inactive'
        WHEN es.offer_id IS NULL THEN '⚠️ Slot has no offer_id'
        WHEN es.event_id IS NULL THEN '⚠️ Slot has no event_id'
        ELSE '✅ Slot looks good'
    END as status
FROM event_slots es
JOIN companies c ON c.id = es.company_id
LEFT JOIN offers o ON o.id = es.offer_id
WHERE c.company_name ILIKE '%charika%' OR c.company_name ILIKE '%3waza%'
ORDER BY es.created_at DESC;

-- 3. Check how many bookings each slot has
SELECT 
    es.id as slot_id,
    es.start_time,
    es.capacity,
    c.company_name,
    COUNT(b.id) as bookings_count,
    es.capacity - COUNT(b.id) as available_spots,
    CASE 
        WHEN COUNT(b.id) >= es.capacity THEN '❌ FULL'
        ELSE '✅ Available'
    END as availability
FROM event_slots es
JOIN companies c ON c.id = es.company_id
LEFT JOIN bookings b ON b.slot_id = es.id AND b.status = 'confirmed'
WHERE c.company_name ILIKE '%charika%' OR c.company_name ILIKE '%3waza%'
GROUP BY es.id, es.start_time, es.capacity, c.company_name
ORDER BY es.start_time;

-- 4. Check if slots are linked to the correct offer
SELECT 
    o.id as offer_id,
    o.title as offer_title,
    COUNT(es.id) as slots_count,
    COUNT(CASE WHEN es.start_time >= NOW() AND es.is_active = true THEN 1 END) as future_active_slots
FROM offers o
LEFT JOIN event_slots es ON es.offer_id = o.id
WHERE o.title ILIKE '%3bid%' OR o.title ILIKE '%v2.1%'
GROUP BY o.id, o.title;

-- 5. Quick fix: If slots exist but aren't linked to offers, show them
SELECT 
    'Slots without offer_id:' as issue,
    COUNT(*) as count
FROM event_slots
WHERE offer_id IS NULL AND is_active = true;

-- 6. Check the event ID being used
SELECT 
    id,
    name,
    date,
    CASE 
        WHEN date >= CURRENT_DATE THEN '✅ Future event'
        ELSE '❌ Past event'
    END as status
FROM events
ORDER BY date DESC
LIMIT 5;
