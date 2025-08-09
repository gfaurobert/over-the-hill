-- Fix decryption function to handle migrated base64 data
-- Migration: 20250809102007_fix_decryption_function.sql

-- Drop the existing function
DROP FUNCTION IF EXISTS decrypt_sensitive_data CASCADE;

-- Create improved decryption function that handles both encrypted and base64-encoded data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, user_key TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    decoded_data BYTEA;
BEGIN
    -- Handle empty or null data
    IF encrypted_data IS NULL OR encrypted_data = '' THEN
        RETURN '';
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
    BEGIN
        result := convert_from(decrypt_iv(
            decoded_data,
            user_key::bytea,
            decode('000102030405060708090A0B0C0D0E0F', 'hex'),
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
