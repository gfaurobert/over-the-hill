# Fix for Production Database: pgp_sym_encrypt Function Not Found

## Problem
When trying to add a new collection, you're getting the error:
```
Encryption failed: function pgp_sym_encrypt(text, text) does not exist
```

This error occurs because the `pgcrypto` extension is not enabled in your production Supabase database.

## Root Cause
The `pgcrypto` extension, which provides the `pgp_sym_encrypt` and `pgp_sym_decrypt` functions, is not installed or enabled in the production database. This extension is required for the application's encryption functionality.

## Solution

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Fix Script**
   - Copy the entire contents of `scripts/fix-production-pgcrypto.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the script

4. **Verify Success**
   - You should see a success message: "SUCCESS: pgcrypto extension and encryption functions are now properly configured!"
   - The script includes automatic tests to verify the functions work correctly

### Method 2: Using Supabase CLI

If you have the Supabase CLI configured:

```bash
# Make sure you're in the project directory
cd /workspace

# Run the fix script
supabase db execute -f scripts/fix-production-pgcrypto.sql
```

### Method 3: Direct Database Connection

If you have direct database access:

```bash
psql "postgresql://postgres:[password]@[host]:[port]/postgres" < scripts/fix-production-pgcrypto.sql
```

## What the Fix Does

1. **Enables pgcrypto Extension**: Installs the PostgreSQL cryptographic functions extension
2. **Verifies Installation**: Checks that pgcrypto was successfully enabled
3. **Creates/Updates Functions**: Ensures the `encrypt_sensitive_data` and `decrypt_sensitive_data` functions are properly configured
4. **Sets Permissions**: Grants necessary execution permissions to authenticated and anonymous users
5. **Tests Functions**: Runs a simple encryption/decryption test to verify everything works
6. **Provides Fallback**: Includes fallback logic for legacy data that might have been stored differently

## Verification

After applying the fix:

1. **Refresh your application**
2. **Try adding a new collection** - it should work without errors
3. **Check existing collections** - they should still be accessible
4. **Monitor the console** - the encryption error should be gone

## Important Notes

- The fix is **backward compatible** with existing data
- Client-side encryption will continue to work as a fallback if needed
- No data migration is required - existing encrypted data remains valid
- The functions use secure practices including:
  - SECURITY DEFINER with safe search_path to prevent SQL injection
  - Proper error handling that fails securely
  - Support for both new encryption and legacy data formats

## Troubleshooting

If the error persists after applying the fix:

1. **Check Extension Privileges**
   - Some Supabase plans may restrict extension installation
   - Contact Supabase support if you see "permission denied to create extension"

2. **Verify the Functions Exist**
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('encrypt_sensitive_data', 'decrypt_sensitive_data');
   ```

3. **Check pgcrypto is Enabled**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
   ```

4. **Test Manually**
   ```sql
   SELECT pgp_sym_encrypt('test', 'key');
   ```

## Alternative: Temporary Workaround

If you cannot immediately fix the database, the application has a client-side encryption fallback that's already working. However, this is less efficient and should only be used temporarily.

## Security Considerations

- The fix maintains all security features of the original implementation
- Encryption keys are never stored in the database
- All sensitive data remains encrypted at rest
- The functions are designed to fail securely if any issues occur

## Related Files

- `scripts/fix-production-pgcrypto.sql` - The main fix script
- `lib/services/privacyService.ts` - Client-side encryption implementation
- `supabase/migrations/20250710091059_create_hill_chart_schema.sql` - Original schema with pgcrypto
- `supabase/migrations/20250809103000_fix_pgp_decryption.sql` - Previous encryption fix