-- Implement proper encryption for previously base64-encoded fields
-- WARNING: Requires a symmetric key to be provided at runtime via:
--   SET app.encryption_key = 'your-strong-migration-key';
-- The key should be managed securely and rotated after use.

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: detect values that are plain UTF-8 text encoded as base64
-- Returns true only if the input can be base64-decoded and converted to UTF-8 text
CREATE OR REPLACE FUNCTION is_base64_of_utf8_text(input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  decoded BYTEA;
  textval TEXT;
BEGIN
  IF input IS NULL OR input = '' THEN
    RETURN FALSE;
  END IF;

  -- Try base64 decode
  BEGIN
    decoded := decode(input, 'base64');
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;

  -- Try convert to UTF-8 text (will raise if invalid)
  BEGIN
    textval := convert_from(decoded, 'utf8');
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ensure a migration key is provided via GUC before proceeding
DO $$
BEGIN
  IF coalesce(current_setting('app.encryption_key', true), '') = '' THEN
    RAISE EXCEPTION 'Missing app.encryption_key. Set it before running this migration: SET app.encryption_key = ''<key>'';';
  END IF;
END $$;

-- Re-encrypt collections.name_encrypted (was base64 of plaintext) using pgp_sym_encrypt
UPDATE collections
SET name_encrypted = encode(
  pgp_sym_encrypt(
    convert_from(decode(name_encrypted, 'base64'), 'utf8'),
    current_setting('app.encryption_key')
  ),
  'base64'
)
WHERE is_base64_of_utf8_text(name_encrypted);

-- Re-encrypt dots.label_encrypted
UPDATE dots
SET label_encrypted = encode(
  pgp_sym_encrypt(
    convert_from(decode(label_encrypted, 'base64'), 'utf8'),
    current_setting('app.encryption_key')
  ),
  'base64'
)
WHERE is_base64_of_utf8_text(label_encrypted);

-- Re-encrypt snapshots.collection_name_encrypted
UPDATE snapshots
SET collection_name_encrypted = encode(
  pgp_sym_encrypt(
    convert_from(decode(collection_name_encrypted, 'base64'), 'utf8'),
    current_setting('app.encryption_key')
  ),
  'base64'
)
WHERE is_base64_of_utf8_text(collection_name_encrypted);

-- Re-encrypt snapshots.dots_data_encrypted (JSON/text)
UPDATE snapshots
SET dots_data_encrypted = encode(
  pgp_sym_encrypt(
    convert_from(decode(dots_data_encrypted, 'base64'), 'utf8'),
    current_setting('app.encryption_key')
  ),
  'base64'
)
WHERE is_base64_of_utf8_text(dots_data_encrypted);

-- Optional: handle any other temporarily encoded fields if present
-- user_preferences.collection_input_encrypted
UPDATE user_preferences
SET collection_input_encrypted = encode(
  pgp_sym_encrypt(
    convert_from(decode(collection_input_encrypted, 'base64'), 'utf8'),
    current_setting('app.encryption_key')
  ),
  'base64'
)
WHERE is_base64_of_utf8_text(collection_input_encrypted);

-- access_requests.message_encrypted
UPDATE access_requests
SET message_encrypted = encode(
  pgp_sym_encrypt(
    convert_from(decode(message_encrypted, 'base64'), 'utf8'),
    current_setting('app.encryption_key')
  ),
  'base64'
)
WHERE is_base64_of_utf8_text(message_encrypted);

-- Clean up: optionally keep the helper, but marking STABLE for future checks is harmless.
-- If you prefer, uncomment the following to remove it after use:
-- DROP FUNCTION is_base64_of_utf8_text(TEXT);


