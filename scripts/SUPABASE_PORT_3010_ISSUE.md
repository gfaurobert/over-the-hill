# Supabase Port 3010 Health Check Issue

## Problem

When running `npx supabase start`, you get this error:
```
failed to execute http request: Head "http://127.0.0.1:3010/rest-admin/v1/ready": dial tcp 127.0.0.1:3010: connect: connection refused
```

## Root Cause

The Supabase CLI **always** checks port **3010** for the REST Admin API health check, regardless of your custom port configuration. 

In your setup:
- `API_PORT=3003` in `.env` → Kong is mapped to port 3003
- But CLI health check expects port 3010 → Connection refused

This is a known limitation: the Supabase CLI hardcodes port 3010 for the health check endpoint.

## Solutions

### Solution 1: Use `--ignore-health-check` Flag (Quick Fix)

Start Supabase while ignoring the health check:

```bash
npx supabase start --ignore-health-check
```

**Pros:**
- Works immediately
- Services start correctly
- All functionality works

**Cons:**
- You need to remember to use the flag every time
- Health checks are useful for ensuring services are ready

### Solution 2: Ensure Port 3010 is Available (Recommended)

The CLI needs port 3010 to be accessible for the health check. Even though Kong runs on port 3003, the health check endpoint should still be accessible.

1. **Check if UFW is blocking port 3010:**
   ```bash
   sudo ufw status | grep 3010
   ```

2. **Open port 3010 in UFW if needed:**
   ```bash
   sudo ufw allow 3010/tcp
   ```

3. **Verify the port is accessible:**
   ```bash
   curl http://127.0.0.1:3010/rest-admin/v1/ready
   ```

4. **Try starting Supabase normally:**
   ```bash
   npx supabase start
   ```

### Solution 3: Use Default Supabase Ports

If you don't need custom ports, use Supabase's default ports:
- Remove or comment out custom port settings in `.env`
- Use default ports (54321 for Kong, etc.)
- Port 3010 will be automatically configured

## Current Status

✅ **Supabase is running successfully** with `--ignore-health-check`
- Studio: http://127.0.0.1:3001
- API: http://127.0.0.1:3010 (reported, but Kong is on 3003)
- Database: postgresql://postgres:postgres@127.0.0.1:3002/postgres

## Verification

After starting Supabase, verify services are running:

```bash
# Check status
npx supabase status

# Check containers
docker ps | grep supabase

# Test API endpoint
curl http://127.0.0.1:3003/rest/v1/
```

## Notes

- Port 3010 is used by Supabase CLI for health checks, not for actual API traffic
- Your actual API is on port 3003 (as configured in `.env`)
- The health check timeout suggests the service might be slow to start, or port 3010 isn't properly exposed
- Using `--ignore-health-check` is safe for local development

## Related Files

- `.env` - Contains `API_PORT=3003`
- `supabase/config.toml` - Uses `env(API_PORT)` for configuration
- `deploy/tim.conf` - Nginx config references port 3010 (needs update to 3003)

