-- Add snapshot_date column to snapshots table
-- Migration: 20250710092000_add_snapshot_date_column.sql

-- Add snapshot_date column for local date storage
ALTER TABLE snapshots ADD COLUMN snapshot_date DATE;

-- Create index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_snapshots_snapshot_date ON snapshots(snapshot_date);

-- Update existing snapshots to have snapshot_date based on created_at
UPDATE snapshots 
SET snapshot_date = created_at::date 
WHERE snapshot_date IS NULL;

-- Add archived column to dots table for soft delete functionality
ALTER TABLE dots ADD COLUMN archived BOOLEAN DEFAULT FALSE;

-- Create index for efficient archived queries
CREATE INDEX IF NOT EXISTS idx_dots_archived ON dots(archived); 