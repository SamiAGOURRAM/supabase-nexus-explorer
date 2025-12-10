-- Fix company_dashboard view security
-- Change from SECURITY DEFINER to SECURITY INVOKER
-- This ensures the view uses the permissions of the querying user, not the view creator

DROP VIEW IF EXISTS company_dashboard;

CREATE VIEW company_dashboard
WITH (security_invoker = true)
AS
SELECT 
    c.id AS company_id,
    c.profile_id,
    c.company_name,
    c.is_verified,
    c.verification_status,
    c.created_at,
    c.verified_at,
    c.rejection_reason,
    COUNT(DISTINCT o.id) AS total_offers,
    COUNT(DISTINCT o.id) FILTER (WHERE o.is_active = true) AS active_offers,
    COUNT(DISTINCT es.id) AS total_slots,
    COUNT(DISTINCT b.id) AS total_bookings,
    CASE 
        WHEN c.is_verified = false THEN 'Your offers are created but invisible to students until admin verification.'
        ELSE 'Your offers are live and visible to students!'
    END AS status_message
FROM companies c
LEFT JOIN offers o ON o.company_id = c.id
LEFT JOIN event_slots es ON es.company_id = c.id
LEFT JOIN bookings b ON b.slot_id = es.id
GROUP BY c.id, c.profile_id, c.company_name, c.is_verified, c.verification_status, c.created_at, c.verified_at, c.rejection_reason;

-- Grant access to authenticated users
GRANT SELECT ON company_dashboard TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW company_dashboard IS 'Dashboard view for companies. Uses SECURITY INVOKER to enforce RLS policies of the querying user. Companies must filter by profile_id = auth.uid() in their queries.';
