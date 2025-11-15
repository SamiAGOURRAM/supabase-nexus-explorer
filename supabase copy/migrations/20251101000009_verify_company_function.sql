-- Drop ALL existing versions of the function (including overloads)
DO $$ 
BEGIN
    -- Drop all versions of fn_verify_company
    DROP FUNCTION IF EXISTS fn_verify_company(UUID, BOOLEAN) CASCADE;
    DROP FUNCTION IF EXISTS fn_verify_company(UUID) CASCADE;
    DROP FUNCTION IF EXISTS fn_verify_company() CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Function to verify/reject companies
CREATE FUNCTION fn_verify_company(
  p_company_id UUID,
  p_is_verified BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can verify companies
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can verify companies';
  END IF;

  -- Update company verification status
  UPDATE companies
  SET 
    is_verified = p_is_verified,
    verification_status = CASE 
      WHEN p_is_verified THEN 'verified'::company_verification_status
      ELSE 'rejected'::company_verification_status
    END,
    verified_by = CASE WHEN p_is_verified THEN auth.uid() ELSE NULL END,
    verified_at = CASE WHEN p_is_verified THEN NOW() ELSE NULL END
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fn_verify_company(UUID, BOOLEAN) TO authenticated;

-- Add comment
COMMENT ON FUNCTION fn_verify_company(UUID, BOOLEAN) IS 'Allows admins to verify or reject company registrations';
