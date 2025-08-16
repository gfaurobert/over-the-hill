-- Fix base64 wrapping issue in encryption functions
-- Migration: 20250809110000_fix_base64_wrapping.sql
-- 
-- This migration fixes the base64 wrapping issue that causes decryption to fail.
-- The problem is that PostgreSQL's encode() function can produce wrapped output
-- that breaks base64 decoding.

-- Drop existing functions
DROP FUNCTION IF EXISTS encrypt_sensitive_data(TEXT, TEXT);
DROP FUNCTION IF EXISTS decrypt_sensitive_data(TEXT, TEXT);

-- Create encryption function that handles base64 wrapping
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, user_key TEXT)
RETURNS TEXT AS $$
DECLARE
    encrypted_bytes BYTEA;
    base64_result TEXT;
BEGIN
    -- Validate inputs
    IF data IS NULL OR data = '' THEN
        RETURN NULL;
    END IF;
    
    IF user_key IS NULL OR user_key = '' THEN
        RAISE EXCEPTION 'User key cannot be null or empty for encryption';
    END IF;
    
    -- Encrypt the data
    encrypted_bytes := pgp_sym_encrypt(data, user_key);
    
    -- Convert to base64 and remove any line breaks or whitespace
    base64_result := encode(encrypted_bytes, 'base64');
    
    -- Remove any line breaks, spaces, or other whitespace that might break base64
    base64_result := regexp_replace(base64_result, '\s+', '', 'g');
    
    RETURN base64_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Encryption error: %', SQLERRM;
        RAISE EXCEPTION 'Encryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create decryption function that handles base64 cleaning
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, user_key TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    decoded_data BYTEA;
    cleaned_data TEXT;
BEGIN
    -- Validate inputs
    IF encrypted_data IS NULL OR encrypted_data = '' THEN
        RETURN '';
    END IF;
    
    IF user_key IS NULL OR user_key = '' THEN
        RAISE EXCEPTION 'User key cannot be null or empty for decryption';
    END IF;
    
    -- Clean the base64 data by removing any whitespace or line breaks
    cleaned_data := regexp_replace(encrypted_data, '\s+', '', 'g');
    
    -- Try to decode and decrypt
    BEGIN
        decoded_data := decode(cleaned_data, 'base64');
        result := pgp_sym_decrypt(decoded_data, user_key);
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error for debugging
            RAISE LOG 'Decryption error: %', SQLERRM;
            RETURN '';
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data TO anon;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data TO anon;

-- Add comments
COMMENT ON FUNCTION encrypt_sensitive_data IS 'Encrypts data using pgp_sym_encrypt with clean base64 encoding. Handles base64 wrapping issues.';
COMMENT ON FUNCTION decrypt_sensitive_data IS 'Decrypts data encrypted with pgp_sym_encrypt. Handles base64 wrapping issues.';
