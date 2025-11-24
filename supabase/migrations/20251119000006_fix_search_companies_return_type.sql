-- =====================================================
-- Fix search_companies_for_invitation return type
-- Migration: 20251119000006_fix_search_companies_return_type
-- =====================================================

DROP FUNCTION IF EXISTS search_companies_for_invitation(text, uuid);

CREATE OR REPLACE FUNCTION search_companies_for_invitation(
  search_query text,
  event_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_code text,
  company_name text,
  email text,
  industry text,
  website text,
  is_verified boolean,
  total_participations bigint,
  last_event_date timestamptz,  -- Changed from date to timestamptz
  last_event_name text,
  already_invited boolean
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH company_history AS (
    SELECT 
      ep.company_id,
      COUNT(*) as participation_count,
      MAX(e.date) as latest_event_date,
      (
        SELECT e2.name 
        FROM event_participants ep2 
        JOIN events e2 ON ep2.event_id = e2.id 
        WHERE ep2.company_id = ep.company_id 
        ORDER BY e2.date DESC 
        LIMIT 1
      ) as latest_event_name
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    GROUP BY ep.company_id
  )
  SELECT 
    c.id,
    c.company_code,
    c.company_name,
    COALESCE(c.email, p.email, 'No email yet') as email,
    c.industry,
    c.website,
    c.is_verified,
    COALESCE(ch.participation_count, 0) as total_participations,
    ch.latest_event_date as last_event_date,
    ch.latest_event_name as last_event_name,
    CASE 
      WHEN event_id_filter IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = event_id_filter AND ep.company_id = c.id
        )
      ELSE false
    END as already_invited
  FROM companies c
  LEFT JOIN profiles p ON c.profile_id = p.id
  LEFT JOIN company_history ch ON ch.company_id = c.id
  WHERE 
    c.is_verified = true
    AND (
      search_query IS NULL 
      OR search_query = ''
      OR LOWER(c.company_name) LIKE LOWER('%' || search_query || '%')
      OR LOWER(c.company_code) LIKE LOWER('%' || search_query || '%')
      OR LOWER(COALESCE(c.email, p.email, '')) LIKE LOWER('%' || search_query || '%')
    )
  ORDER BY 
    -- Not invited first, then by participation history
    CASE WHEN event_id_filter IS NOT NULL THEN
      (SELECT COUNT(*) FROM event_participants WHERE event_id = event_id_filter AND company_id = c.id)
    ELSE 0 END ASC,
    COALESCE(ch.participation_count, 0) DESC,
    c.company_name ASC
  LIMIT 100;
END;
$$;

COMMENT ON FUNCTION search_companies_for_invitation IS 
'🔍 Search companies by name/code/email. Shows participation history, perfect for re-invitations.';

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
