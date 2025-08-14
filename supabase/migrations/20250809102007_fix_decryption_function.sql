-- Fix decryption function to handle migrated base64 data
-- Migration: 20250809102007_fix_decryption_function.sql
-- 
-- SECURITY NOTE: This migration validates user_key and raises exceptions for null/empty keys
-- to maintain consistency with other migrations and prevent silent security failures.
-- 
-- SECURITY NOTE: This function uses SECURITY DEFINER and sets a safe search_path
-- to prevent search path hijacking attacks.
-- 
-- SECURITY IMPROVEMENT: Fixed hard-coded IV vulnerability by extracting unique IV from ciphertext.
-- Each encrypted value now uses its own unique IV stored in the first 16 bytes of the data.

-- Drop the existing function
DROP FUNCTION IF EXISTS decrypt_sensitive_data CASCADE;

-- Create improved decryption function that handles both encrypted and base64-encoded data
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
    
    -- Validate user key - consistent with other migrations
    IF user_key IS NULL OR user_key = '' THEN
        RAISE EXCEPTION 'User key cannot be null or empty for decryption';
    END IF;
    
    -- First try to decode as base64 to check if it's valid base64
    BEGIN
        decoded_data := decode(encrypted_data, 'base64');
    EXCEPTION
        WHEN OTHERS THEN
            -- If base64 decode fails, return the original data
            RETURN encrypted_data;
    END;
    
    -- Try AES decryption first (for properly encrypted data)
    -- Extract IV from the first 16 bytes of the ciphertext for secure decryption
    BEGIN
        -- Check if we have enough data for IV + ciphertext (minimum 17 bytes)
        IF length(decoded_data) < 17 THEN
            -- Not enough data for IV + ciphertext, skip AES decryption
            NULL;
        ELSE
            -- Extract IV (first 16 bytes) and ciphertext (remaining bytes)
            DECLARE
                iv BYTEA;
                ciphertext BYTEA;
            BEGIN
                iv := substring(decoded_data from 1 for 16);
                ciphertext := substring(decoded_data from 17);
                
                -- Attempt decryption with extracted IV
                result := convert_from(decrypt_iv(
                    ciphertext,
                    user_key::bytea,
                    iv,
                    'aes-cbc'
                ), 'utf8');
                
                -- Check if the result contains valid UTF-8 by trying to validate it
                -- If decryption worked, we should get valid text
                IF result IS NOT NULL AND length(result) > 0 THEN
                    -- Additional check: ensure the result doesn't contain too many control characters
                    -- which would indicate it's still encrypted/corrupted data
                    IF (length(regexp_replace(result, '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')) / GREATEST(length(result), 1)::float) > 0.8 THEN
                        RETURN result;
                    END IF;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Decryption failed, continue to fallback
                    NULL;
            END;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Decryption failed, continue to fallback
            NULL;
    END;
    
    -- Fallback: try simple base64 decoding (for migrated data)
    BEGIN
        result := convert_from(decoded_data, 'utf8');
        
        -- Validate that this is reasonable text data
        IF result IS NOT NULL AND length(result) > 0 THEN
            -- Check if it's mostly printable characters (not binary data)
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
