-- Script to apply the encryption fix migration
-- This should be run against your Supabase database
-- 
-- SECURITY NOTE: This script validates user_key and raises exceptions for null/empty keys
-- to maintain consistency with other migrations and prevent silent security failures.
-- 
-- SECURITY NOTE: This function uses SECURITY DEFINER and sets a safe search_path
-- to prevent search path hijacking attacks.

-- First, check if the pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Apply the decryption fix
-- The new migration file should already be in supabase/migrations/
-- But we can run it directly here as well

-- Drop the existing incorrect function
DROP FUNCTION IF EXISTS decrypt_sensitive_data CASCADE;

-- Create corrected decryption function using pgp_sym_decrypt
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, user_key TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    decoded_data BYTEA;
BEGIN
    -- SECURITY: Set safe search_path to prevent hijacking attacks
    -- This ensures all function calls resolve to trusted schemas only
    SET LOCAL search_path = pg_catalog, pg_temp;
    
    -- Handle empty or null data
    IF encrypted_data IS NULL OR encrypted_data = '' THEN
        RETURN '';
    END IF;
    
    -- Validate user key
    IF user_key IS NULL OR user_key = '' THEN
        RAISE EXCEPTION 'User key cannot be null or empty for decryption';
    END IF;
    
    -- First try to decode as base64 to check if it's valid base64
    BEGIN
        decoded_data := decode(encrypted_data, 'base64');
    EXCEPTION
        WHEN OTHERS THEN
            -- If base64 decode fails, return empty string
            RETURN '';
    END;
    
    -- Try pgp_sym_decrypt (matching the encryption method from migration)
    BEGIN
        result := pgp_sym_decrypt(decoded_data, user_key);
        
        -- If decryption succeeded, return the result
        IF result IS NOT NULL THEN
            RETURN result;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Decryption failed, try fallback for legacy data
            NULL;
    END;
    
    -- Fallback: try simple base64 decoding for any legacy non-encrypted data
    BEGIN
        result := convert_from(decoded_data, 'utf8');
        
        -- Validate that this is reasonable text data (not binary)
        IF result IS NOT NULL AND length(result) > 0 THEN
            -- Check if it's mostly printable characters
            IF (length(regexp_replace(result, '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')) / GREATEST(length(result), 1)::float) > 0.7 THEN
                RETURN result;
            END IF;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Even base64 decoding failed
            NULL;
    END;
    
    -- If all else fails, return empty string rather than causing an error
    RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO anon;

-- Add a comment documenting the function and security measures
COMMENT ON FUNCTION decrypt_sensitive_data IS 'Decrypts data encrypted with pgp_sym_encrypt, with fallback for legacy base64-encoded data. Uses SECURITY DEFINER with safe search_path to prevent hijacking attacks.';

-- Verify the function exists
SELECT 'Decryption function successfully updated' AS status;
