-- =====================================================
-- Rate Limiting Helper Functions
-- Migration: 20251119000004_rate_limit_helpers
-- =====================================================
-- This migration adds utility helper functions to keep
-- frontend/UI aligned with backend rate limiting policies.
-- =====================================================

-- Drop existing functions if they exist (for idempotency)
-- Note: Must drop before recreating if return type changes
-- Drop all overloaded versions of these functions
DO $$
DECLARE
  r RECORD;
  func_sig TEXT;
BEGIN
  -- Drop all versions of fn_clear_rate_limit
  FOR r IN 
    SELECT oid, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'fn_clear_rate_limit'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    func_sig := 'fn_clear_rate_limit(' || COALESCE(r.args, '') || ')';
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_sig || ' CASCADE';
  END LOOP;
  
  -- Drop all versions of fn_rate_limit_status
  FOR r IN 
    SELECT oid, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'fn_rate_limit_status'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    func_sig := 'fn_rate_limit_status(' || COALESCE(r.args, '') || ')';
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_sig || ' CASCADE';
  END LOOP;
END $$;

-- Function: fn_clear_rate_limit
-- Removes stored failed attempts for a given email/IP pair.
CREATE OR REPLACE FUNCTION fn_clear_rate_limit(
  p_email TEXT,
  p_ip_address TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM failed_login_attempts
  WHERE email = p_email
     OR ip_address = p_ip_address::INET;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN COALESCE(v_deleted, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_clear_rate_limit(TEXT, TEXT) TO authenticated, anon;
COMMENT ON FUNCTION fn_clear_rate_limit(TEXT, TEXT) IS
  'Clears stored failed login attempts for a specific email or IP address.';

-- Function: fn_rate_limit_status
-- Returns structured information about the current window.
CREATE OR REPLACE FUNCTION fn_rate_limit_status(
  p_email TEXT,
  p_ip_address TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 15
) RETURNS TABLE (
  allowed BOOLEAN,
  attempt_count INT,
  remaining_attempts INT,
  wait_time_minutes INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_window INTERVAL := (p_window_minutes || ' minutes')::INTERVAL;
  v_attempts INT := 0;
  v_oldest TIMESTAMPTZ;
  v_wait INT := 0;
BEGIN
  SELECT
    COUNT(*)::INT,
    MIN(attempt_time)
  INTO
    v_attempts,
    v_oldest
  FROM failed_login_attempts
  WHERE (email = p_email OR ip_address = p_ip_address::INET)
    AND attempt_time > NOW() - v_window;

  IF v_attempts >= p_max_attempts AND v_oldest IS NOT NULL THEN
    v_wait := GREATEST(
      CEIL(
        EXTRACT(EPOCH FROM (v_oldest + v_window - NOW())) / 60.0
      )::INT,
      0
    );
  END IF;

  RETURN QUERY
    SELECT
      v_attempts < p_max_attempts AS allowed,
      v_attempts,
      GREATEST(p_max_attempts - v_attempts, 0) AS remaining_attempts,
      v_wait AS wait_time_minutes;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_rate_limit_status(TEXT, TEXT, INT, INT) TO authenticated, anon;
COMMENT ON FUNCTION fn_rate_limit_status(TEXT, TEXT, INT, INT) IS
  'Returns whether requests are allowed plus remaining attempts and wait times.';

-- =====================================================
-- Migration Complete! ✅
-- =====================================================
-- Functions created:
-- 1. fn_clear_rate_limit - Clears failed login attempts
-- 2. fn_rate_limit_status - Returns rate limit status with details
-- =====================================================
