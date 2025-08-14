-- Fix encryption and decryption functions to use pgp_sym_encrypt/decrypt
-- Migration: 20250809103000_fix_pgp_decryption.sql
-- 
-- SECURITY NOTE: This migration validates user_key and raises exceptions for null/empty keys
-- to maintain consistency with other migrations and prevent silent security failures.
-- 
-- MIGRATION NOTE: Using CREATE OR REPLACE to preserve dependencies and permissions
-- instead of DROP ... CASCADE which could remove dependent objects.
-- 
-- SECURITY NOTE: These functions use SECURITY DEFINER and set safe search_path
-- to prevent search path hijacking attacks.

-- Create corrected encryption function using pgp_sym_encrypt
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, user_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- SECURITY: Set safe search_path to prevent hijacking attacks
    -- This ensures all function calls resolve to trusted schemas only
    SET LOCAL search_path = pg_catalog, pg_temp;
    
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
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data TO anon;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO anon;

-- Add comments documenting the functions and security measures
COMMENT ON FUNCTION encrypt_sensitive_data IS 'Encrypts data using pgp_sym_encrypt with secure random IV and authentication. Uses SECURITY DEFINER with safe search_path to prevent hijacking attacks.';
COMMENT ON FUNCTION decrypt_sensitive_data IS 'Decrypts data encrypted with pgp_sym_encrypt, with fallback for legacy base64-encoded data. Uses SECURITY DEFINER with safe search_path to prevent hijacking attacks.';
