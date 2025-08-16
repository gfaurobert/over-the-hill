-- Fix existing encrypted data with broken base64 strings
-- Migration: 20250809111000_fix_existing_encrypted_data.sql
-- 
-- This migration fixes existing encrypted data that has line breaks
-- which break base64 decoding.

-- First, let's see what we're working with
DO $$
DECLARE
    collection_record RECORD;
    fixed_count INTEGER := 0;
BEGIN
    -- Log the current state
    RAISE NOTICE 'Starting to fix existing encrypted data...';
    
    -- Loop through all collections and fix the encrypted names
    FOR collection_record IN 
        SELECT id, name_encrypted, name_hash 
        FROM collections 
        WHERE name_encrypted IS NOT NULL 
        AND name_encrypted != ''
    LOOP
        -- Clean the base64 string by removing whitespace and line breaks
        UPDATE collections 
        SET name_encrypted = regexp_replace(collection_record.name_encrypted, '\s+', '', 'g')
        WHERE id = collection_record.id;
        
        fixed_count := fixed_count + 1;
        
        -- Log progress every 10 records
        IF fixed_count % 10 = 0 THEN
            RAISE NOTICE 'Fixed % records so far...', fixed_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed fixing encrypted data. Total records processed: %', fixed_count;
END $$;

-- Verify the fix worked by checking a few records
SELECT 
    id, 
    length(name_encrypted) as encrypted_length,
    CASE 
        WHEN name_encrypted ~ '^\s*$' THEN 'EMPTY'
        WHEN name_encrypted ~ '\s' THEN 'HAS_WHITESPACE'
        ELSE 'CLEAN'
    END as status
FROM collections 
WHERE name_encrypted IS NOT NULL 
LIMIT 5;
