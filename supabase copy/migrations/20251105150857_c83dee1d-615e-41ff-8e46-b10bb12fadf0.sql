-- Allow public (unauthenticated) users to view verified companies
-- This is needed for the public offers page to display company information
CREATE POLICY "Public can view verified companies"
ON companies
FOR SELECT
TO public
USING (is_verified = true);