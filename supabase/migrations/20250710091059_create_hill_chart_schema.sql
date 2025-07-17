-- Create Hill Chart Database Schema with Row-Level Security
-- Migration: 20250710091059_create_hill_chart_schema.sql

-- Drop existing objects to ensure a clean migration
DROP TABLE IF EXISTS access_requests CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;
DROP TABLE IF EXISTS dots CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create collections table
-- Uses TEXT for ID to match the string-based IDs from the JSON import (e.g., "project-a").
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, name)
);

-- Create dots table
-- Uses a composite primary key (id, collection_id) because dot IDs are unique within a collection.
-- Column names 'x' and 'y' now match the JSON structure.
CREATE TABLE dots (
    id TEXT NOT NULL,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    x DECIMAL(10, 7) NOT NULL,
    y DECIMAL(10, 7) NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    size INTEGER NOT NULL DEFAULT 3 CHECK (size >= 1 AND size <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, collection_id)
);

-- Create snapshots table
-- References collections via TEXT ID. Dots data is stored in a flexible JSONB column.
CREATE TABLE snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    collection_name TEXT NOT NULL,
    -- The 'timestamp' from JSON can be stored here, converted to a timestamptz
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    dots_data JSONB NOT NULL,
    UNIQUE(user_id, collection_id, created_at)
);

-- Create user_preferences table
-- References collections via TEXT ID.
CREATE TABLE user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    selected_collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
    collection_input TEXT DEFAULT '',
    hide_collection_name BOOLEAN DEFAULT FALSE,
    copy_format TEXT DEFAULT 'PNG' CHECK (copy_format IN ('PNG', 'SVG')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create access_requests table
-- Stores access requests from new users (no user_id reference since they're not users yet)
CREATE TABLE access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_dots_collection_id ON dots(collection_id);
CREATE INDEX IF NOT EXISTS idx_dots_user_id ON dots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_collection_id ON snapshots(collection_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dots_updated_at BEFORE UPDATE ON dots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_requests_updated_at BEFORE UPDATE ON access_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Drop existing policies before creating new ones to ensure idempotency.
DROP POLICY IF EXISTS "Users can view their own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;

DROP POLICY IF EXISTS "Users can view dots from their collections" ON dots;
DROP POLICY IF EXISTS "Users can insert dots in their collections" ON dots;
DROP POLICY IF EXISTS "Users can update dots in their collections" ON dots;
DROP POLICY IF EXISTS "Users can delete dots in their collections" ON dots;

DROP POLICY IF EXISTS "Users can view their own snapshots" ON snapshots;
DROP POLICY IF EXISTS "Users can insert their own snapshots" ON snapshots;
DROP POLICY IF EXISTS "Users can update their own snapshots" ON snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshots" ON snapshots;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Anyone can submit access requests" ON access_requests;
DROP POLICY IF EXISTS "Only service role can manage access requests" ON access_requests;

-- Collections RLS Policies
CREATE POLICY "Users can view their own collections" ON collections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON collections
    FOR DELETE USING (auth.uid() = user_id);

-- Dots RLS Policies
CREATE POLICY "Users can view dots from their collections" ON dots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert dots in their collections" ON dots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update dots in their collections" ON dots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete dots in their collections" ON dots
    FOR DELETE USING (auth.uid() = user_id);

-- Snapshots RLS Policies
CREATE POLICY "Users can view their own snapshots" ON snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots" ON snapshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots" ON snapshots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots" ON snapshots
    FOR DELETE USING (auth.uid() = user_id);

-- User Preferences RLS Policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own user_preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Access Requests RLS Policies
-- Allow anyone to submit access requests (public form)
CREATE POLICY "Anyone can submit access requests" ON access_requests
    FOR INSERT WITH CHECK (true);

-- Only allow service role to view/manage access requests (admin functionality)
CREATE POLICY "Only service role can manage access requests" ON access_requests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on all tables
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
