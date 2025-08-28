-- Hash Migration Tracking
-- This migration doesn't change the schema - it just documents the hash format change
-- The actual hash migration is done via the Node.js migration script

-- Add a comment to document the hash format change
COMMENT ON COLUMN collections.name_hash IS 'Salted hash for privacy-preserving search (migrated from unsalted SHA-256)';
COMMENT ON COLUMN dots.label_hash IS 'Salted hash for privacy-preserving search (migrated from unsalted SHA-256)';

-- Optional: Create a migration tracking table (if you want to track data migrations)
CREATE TABLE IF NOT EXISTS data_migrations (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    description TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    notes TEXT
);

-- Insert a record for this hash migration (will be updated by the Node.js script)
INSERT INTO data_migrations (migration_name, description, status) 
VALUES (
    'hash_salting_migration', 
    'Migrate search hashes from unsalted SHA-256 to salted format for improved security',
    'pending'
) ON CONFLICT (migration_name) DO NOTHING;