-- Add Release Line Configuration Support
-- Migration: 20250906000000_add_release_line_config.sql

-- Add release_line_config_encrypted column to collections table
-- This will store encrypted JSON containing release line settings (enabled, color, text)
DO $$ 
BEGIN
    -- Add release_line_config_encrypted column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='release_line_config_encrypted') THEN
        ALTER TABLE collections ADD COLUMN release_line_config_encrypted TEXT;
    END IF;
END $$;

-- Add helpful comment for documentation
COMMENT ON COLUMN collections.release_line_config_encrypted IS 'Encrypted JSON containing release line configuration (enabled, color, text)';

-- Note: No index is needed for this column as it's not used for searching
-- The encrypted data is only retrieved when loading collection details