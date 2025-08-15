-- Fix for Production Database: Enable pgcrypto and restore encryption functions
-- This script resolves the "function pgp_sym_encrypt does not exist" error
-- Run this in your Supabase SQL Editor

-- Step 1: Enable the pgcrypto extension (required for encryption functions)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Verify pgcrypto is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) THEN
        RAISE EXCEPTION 'pgcrypto extension failed to install. Please contact Supabase support.';
    END IF;
END $$;

-- Step 3: Create or replace the encryption function
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, user_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- SECURITY: Set safe search_path to prevent hijacking attacks
    SET LOCAL search_path = pg_catalog, public, pg_temp;
    
    -- Use pgp_sym_encrypt for secure encryption with random IV and authentication
    IF data IS NULL OR data = '' THEN
        RETURN NULL;
    END IF;
    
    IF user_key IS NULL OR user_key = '' THEN
        RAISE EXCEPTION 'User key cannot be null or empty for encryption';
    END IF;
    
    RETURN encode(public.pgp_sym_encrypt(data, user_key), 'base64');
EXCEPTION
    WHEN OTHERS THEN
        -- Fail securely - do not store unencrypted data
        RAISE EXCEPTION 'Encryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create or replace the decryption function
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, user_key TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    decoded_data BYTEA;
BEGIN
    -- SECURITY: Set safe search_path to prevent hijacking attacks
    SET LOCAL search_path = pg_catalog, public, pg_temp;
    
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
    
    -- Try pgp_sym_decrypt (matching the encryption method)
    BEGIN
        result := public.pgp_sym_decrypt(decoded_data, user_key);
        
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

-- Step 5: Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data TO anon;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO anon;

-- Step 6: Add documentation comments
COMMENT ON FUNCTION encrypt_sensitive_data IS 'Encrypts data using pgp_sym_encrypt with secure random IV and authentication. Uses SECURITY DEFINER with safe search_path to prevent hijacking attacks.';
COMMENT ON FUNCTION decrypt_sensitive_data IS 'Decrypts data encrypted with pgp_sym_encrypt, with fallback for legacy base64-encoded data. Uses SECURITY DEFINER with safe search_path to prevent hijacking attacks.';

-- Step 7: Verify functions exist and work
DO $$
DECLARE
    test_data TEXT := 'test_encryption';
    test_key TEXT := 'test_key_123';
    encrypted TEXT;
    decrypted TEXT;
BEGIN
    -- Test encryption
    encrypted := encrypt_sensitive_data(test_data, test_key);
    IF encrypted IS NULL THEN
        RAISE EXCEPTION 'Encryption test failed: NULL result';
    END IF;
    
    -- Test decryption
    decrypted := decrypt_sensitive_data(encrypted, test_key);
    IF decrypted != test_data THEN
        RAISE EXCEPTION 'Decryption test failed: Expected %, got %', test_data, decrypted;
    END IF;
    
    RAISE NOTICE 'Encryption functions successfully installed and tested!';
END $$;

-- Step 8: Display success message
SELECT 
    'SUCCESS: pgcrypto extension and encryption functions are now properly configured!' AS status,
    current_timestamp AS completed_at;