-- Create Hill Chart Database Schema with Row-Level Security and Encryption
-- Migration: 20250710091059_create_hill_chart_schema.sql

-- Drop existing objects to ensure a clean migration
DROP TABLE IF EXISTS access_requests CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;
DROP TABLE IF EXISTS dots CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Drop encryption functions if they exist
DROP FUNCTION IF EXISTS encrypt_sensitive_data CASCADE;
DROP FUNCTION IF EXISTS decrypt_sensitive_data CASCADE;

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Create encryption functions for sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, user_key TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use pgp_sym_encrypt for secure encryption with random IV and authentication
  -- This function automatically generates a random IV and includes integrity protection
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  
  IF user_key IS NULL OR user_key = '' THEN
    RAISE EXCEPTION 'User key cannot be null or empty for encryption';
  END IF;
  
  RETURN encode(pgp_sym_encrypt(data, user_key), 'base64');
EXCEPTION
  WHEN OTHERS THEN
    -- Fail securely - do not store unencrypted data
    RAISE EXCEPTION 'Encryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, user_key TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use pgp_sym_decrypt for secure decryption with integrity verification
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN NULL;
  END IF;
  
  IF user_key IS NULL OR user_key = '' THEN
    RAISE EXCEPTION 'User key cannot be null or empty for decryption';
  END IF;
  
  RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), user_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Fail securely - do not return potentially corrupted or unencrypted data
    RAISE EXCEPTION 'Decryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create collections table with encrypted name field
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name_encrypted TEXT NOT NULL, -- Encrypted collection name
    name_hash TEXT NOT NULL, -- Hash for searching without decryption
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, name_hash)
);

-- Create dots table with encrypted label field
CREATE TABLE dots (
    id TEXT NOT NULL,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label_encrypted TEXT NOT NULL, -- Encrypted dot label
    label_hash TEXT NOT NULL, -- Hash for searching without decryption
    x DECIMAL(10, 7) NOT NULL,
    y DECIMAL(10, 7) NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    size INTEGER NOT NULL DEFAULT 3 CHECK (size >= 1 AND size <= 5),
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, collection_id)
);

-- Create snapshots table with encrypted data
CREATE TABLE snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    collection_name_encrypted TEXT NOT NULL, -- Encrypted collection name
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    snapshot_date TEXT NOT NULL,
    dots_data_encrypted TEXT NOT NULL, -- Encrypted dots data
    UNIQUE(user_id, collection_id, created_at)
);

-- Create user_preferences table
CREATE TABLE user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    selected_collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
    collection_input_encrypted TEXT DEFAULT '', -- Encrypted collection input
    hide_collection_name BOOLEAN DEFAULT FALSE,
    copy_format TEXT DEFAULT 'PNG' CHECK (copy_format IN ('PNG', 'SVG')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create access_requests table
CREATE TABLE access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    message_encrypted TEXT DEFAULT '', -- Encrypted message
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(email)
);

-- Create indexes for performance (excluding encrypted fields)
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
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
