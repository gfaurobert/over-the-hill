-- Simplify and fix encryption functions
-- Migration: 20250809105000_simplify_encryption_functions.sql
-- 
-- This migration creates simplified, more robust encryption functions that
-- properly handle the pgcrypto functions and base64 encoding.

-- Drop existing functions first
DROP FUNCTION IF EXISTS encrypt_sensitive_data(TEXT, TEXT);
DROP FUNCTION IF EXISTS decrypt_sensitive_data(TEXT, TEXT);

-- Create simplified encryption function
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, user_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Validate inputs
    IF data IS NULL OR data = '' THEN
        RETURN NULL;
    END IF;
    
    IF user_key IS NULL OR user_key = '' THEN
        RAISE EXCEPTION 'User key cannot be null or empty for encryption';
    END IF;
    
    -- Use pgp_sym_encrypt and encode to base64
    -- The extensions schema should be in the search_path by default
    RETURN encode(pgp_sym_encrypt(data, user_key), 'base64');
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Encryption error: %', SQLERRM;
        RAISE EXCEPTION 'Encryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simplified decryption function
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, user_key TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    decoded_data BYTEA;
BEGIN
    -- Validate inputs
    IF encrypted_data IS NULL OR encrypted_data = '' THEN
        RETURN '';
    END IF;
    
    IF user_key IS NULL OR user_key = '' THEN
        RAISE EXCEPTION 'User key cannot be null or empty for decryption';
    END IF;
    
    -- Decode base64 and decrypt
    BEGIN
        decoded_data := decode(encrypted_data, 'base64');
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
COMMENT ON FUNCTION encrypt_sensitive_data IS 'Encrypts data using pgp_sym_encrypt with base64 encoding. Simplified version for reliability.';
COMMENT ON FUNCTION decrypt_sensitive_data IS 'Decrypts data encrypted with pgp_sym_encrypt. Simplified version for reliability.';
