# Encryption Fix for Collections and Dots Labels

## Problem
After migrating from base64 encoding to pgp_sym_encrypt encryption, the application couldn't properly decrypt collections and dots labels. This was due to a mismatch between the encryption method (pgp_sym_encrypt) and the decryption method (decrypt_iv with AES-CBC).

## Root Cause
- The migration `20250725000001_implement_proper_encryption.sql` correctly encrypted data using `pgp_sym_encrypt`
- The subsequent "fix" migration `20250809102007_fix_decryption_function.sql` incorrectly changed the decryption function to use `decrypt_iv` with AES-CBC
- These two methods are incompatible, causing decryption to fail

## Solution
The fix restores the proper `pgp_sym_decrypt` function to match the encryption method.

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `scripts/apply-encryption-fix.sql`
4. Paste and run the SQL in the editor
5. You should see "Decryption function successfully updated" message

### Option 2: Using Supabase CLI
1. Link your project (if not already linked):
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. Apply the migration:
   ```bash
   supabase db push
   ```

### Option 3: Direct SQL Connection
If you have direct database access:
```bash
psql "postgresql://postgres:[password]@[host]:[port]/postgres" < scripts/apply-encryption-fix.sql
```

## Verification
After applying the fix, verify that:
1. Collections names are displayed correctly
2. Dots labels are visible
3. Snapshots show collection names and dots data properly

## Important Notes
- The new decryption function includes fallback logic for legacy base64-encoded data
- No data re-encryption is needed - the fix only updates the decryption function
- The function is backward compatible with both encrypted and legacy data

## Files Changed
- Created: `supabase/migrations/20250809103000_fix_pgp_decryption.sql`
- Created: `scripts/apply-encryption-fix.sql` (direct application script)
- Created: `scripts/ENCRYPTION_FIX_README.md` (this file)

## Migration History
1. `20250710091059_create_hill_chart_schema.sql` - Original schema with pgp_sym_decrypt
2. `20250725000001_implement_proper_encryption.sql` - Re-encrypted data using pgp_sym_encrypt
3. `20250809102007_fix_decryption_function.sql` - Incorrectly changed to decrypt_iv
4. `20250809103000_fix_pgp_decryption.sql` - **Current fix** - Restores pgp_sym_decrypt
