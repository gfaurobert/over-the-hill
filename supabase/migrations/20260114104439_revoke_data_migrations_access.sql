-- Revoke PostgREST access from data_migrations table
-- This table is for internal migration tracking and should not be exposed via the API

-- Revoke all permissions from anon and authenticated roles
REVOKE ALL ON TABLE data_migrations FROM anon;
REVOKE ALL ON TABLE data_migrations FROM authenticated;

-- Ensure RLS is enabled (defense in depth)
ALTER TABLE data_migrations ENABLE ROW LEVEL SECURITY;

-- Create a deny-all policy (no one can access via PostgREST)
CREATE POLICY "Deny all access to data_migrations" ON data_migrations
    FOR ALL USING (false);

-- Add a comment explaining why this table is not exposed
COMMENT ON TABLE data_migrations IS 'Internal table for tracking data migrations. Not exposed via PostgREST API.';
