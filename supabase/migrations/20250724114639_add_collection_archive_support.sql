-- Add Collection Archive/Delete Support
-- Migration: 20250724114639_add_collection_archive_support.sql

-- Add status column and timestamp tracking to collections table
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='status') THEN
        ALTER TABLE collections ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        ALTER TABLE collections ADD CONSTRAINT collections_status_check CHECK (status IN ('active', 'archived', 'deleted'));
    END IF;
    
    -- Add archived_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='archived_at') THEN
        ALTER TABLE collections ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='deleted_at') THEN
        ALTER TABLE collections ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Performance indexes for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_user_status ON collections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_collections_archived_at ON collections(archived_at) 
    WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collections_deleted_at ON collections(deleted_at) 
    WHERE deleted_at IS NOT NULL;

-- Drop existing collection RLS policies to update them
DROP POLICY IF EXISTS "Users can view their own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;

-- Updated RLS policies that handle status filtering
CREATE POLICY "Users can view their own active/archived collections" ON collections
    FOR SELECT USING (auth.uid() = user_id AND status != 'deleted');

CREATE POLICY "Users can insert their own collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'active');

CREATE POLICY "Users can update their own collections" ON collections
    FOR UPDATE USING (auth.uid() = user_id AND status != 'deleted');

CREATE POLICY "Users can delete their own collections" ON collections
    FOR DELETE USING (auth.uid() = user_id);

-- Update trigger to handle status transitions and timestamps
CREATE OR REPLACE FUNCTION handle_collection_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Set archived_at when status changes to archived
    IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
        NEW.archived_at = NOW();
    END IF;
    
    -- Set deleted_at when status changes to deleted
    IF NEW.status = 'deleted' AND OLD.status != 'deleted' THEN
        NEW.deleted_at = NOW();
    END IF;
    
    -- Clear archived_at when status changes from archived to active
    IF NEW.status = 'active' AND OLD.status = 'archived' THEN
        NEW.archived_at = NULL;
    END IF;
    
    -- Update updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for status change handling
CREATE TRIGGER collection_status_change_trigger 
    BEFORE UPDATE ON collections
    FOR EACH ROW 
    EXECUTE FUNCTION handle_collection_status_change();

-- Add helpful comments for documentation
COMMENT ON COLUMN collections.status IS 'Collection status: active (visible), archived (hidden but recoverable), deleted (marked for cleanup)';
COMMENT ON COLUMN collections.archived_at IS 'Timestamp when collection was archived, NULL for active collections';  
COMMENT ON COLUMN collections.deleted_at IS 'Timestamp when collection was deleted, NULL for active/archived collections';
COMMENT ON INDEX idx_collections_status IS 'Index for efficient status filtering queries';
COMMENT ON INDEX idx_collections_user_status IS 'Composite index for user-specific status queries';
