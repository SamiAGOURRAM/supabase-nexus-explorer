-- Enhanced Email Verification and Security
-- This migration adds email verification tracking and security features

-- Create email verification log table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'signup_attempt', 'login_attempt', 'password_change', etc.
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create failed login attempts table (rate limiting)
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  ip_address INET,
  attempt_time TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_time ON failed_login_attempts(attempt_time);

-- Enable RLS on new tables
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_verifications
CREATE POLICY "Users can view own email verifications"
  ON email_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all email verifications"
  ON email_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for security_audit_log
CREATE POLICY "Users can view own audit logs"
  ON security_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON security_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON security_audit_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for failed_login_attempts
CREATE POLICY "Admins can view failed login attempts"
  ON failed_login_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert failed attempts"
  ON failed_login_attempts FOR INSERT
  WITH CHECK (true);

-- Function to log security events
CREATE OR REPLACE FUNCTION fn_log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_success BOOLEAN,
  p_details JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    event_type,
    ip_address,
    user_agent,
    success,
    details
  ) VALUES (
    p_user_id,
    p_event_type,
    p_ip_address::INET,
    p_user_agent,
    p_success,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to check rate limiting
CREATE OR REPLACE FUNCTION fn_check_rate_limit(
  p_email TEXT,
  p_ip_address TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 15
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_count INT;
BEGIN
  -- Count recent failed attempts
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM failed_login_attempts
  WHERE (email = p_email OR ip_address = p_ip_address::INET)
    AND attempt_time > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Return true if under limit, false if over
  RETURN v_attempt_count < p_max_attempts;
END;
$$;

-- Function to record failed login
CREATE OR REPLACE FUNCTION fn_record_failed_login(
  p_email TEXT,
  p_ip_address TEXT,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO failed_login_attempts (email, ip_address, reason)
  VALUES (p_email, p_ip_address::INET, p_reason);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM failed_login_attempts
  WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to clean up old audit logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION fn_cleanup_old_audit_logs(
  p_days_to_keep INT DEFAULT 90
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- Only admins can run this
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can clean up audit logs';
  END IF;
  
  DELETE FROM security_audit_log
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION fn_log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION fn_check_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fn_record_failed_login TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fn_cleanup_old_audit_logs TO authenticated;

-- Add updated_at trigger for email_verifications
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_email_verifications_timestamp
  BEFORE UPDATE ON email_verifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Add comment documentation
COMMENT ON TABLE email_verifications IS 'Tracks email verification status and token management';
COMMENT ON TABLE security_audit_log IS 'Logs security-related events for monitoring and compliance';
COMMENT ON TABLE failed_login_attempts IS 'Tracks failed login attempts for rate limiting and security';
COMMENT ON FUNCTION fn_log_security_event IS 'Logs security events to audit trail';
COMMENT ON FUNCTION fn_check_rate_limit IS 'Checks if user/IP has exceeded rate limit';
COMMENT ON FUNCTION fn_record_failed_login IS 'Records failed login attempt for rate limiting';
