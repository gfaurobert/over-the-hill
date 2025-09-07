-- Add release_line_config_encrypted column to snapshots table
-- Migration: 20250906000001_add_release_line_config_to_snapshots.sql

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='snapshots' AND column_name='release_line_config_encrypted') THEN
        ALTER TABLE snapshots ADD COLUMN release_line_config_encrypted TEXT;
    END IF;
END $$;

-- Update existing snapshots to have null release_line_config_encrypted (graceful handling)
-- No need to update existing records as NULL is acceptable for optional release line config