# Troubleshooting Guide

## Common Issues and Solutions

### 🔄 Collections Data Lost on Page Refresh

**Symptoms:**
- Login works fine initially
- After refreshing the page, all collections data disappears
- Console shows errors like:
  ```
  POST /api/auth/validate 503 (Service Unavailable)
  [SESSION_VALIDATION] Validation failed: Server-side validation not available in development mode (SERVER_VALIDATION_UNAVAILABLE)
  [SESSION_VALIDATION] Falling back to client-side validation
  ```

**Root Cause:**
The `SUPABASE_SERVICE_ROLE_KEY` environment variable is not set in your production environment. This causes server-side session validation to fail, leading to unreliable client-side fallback that doesn't properly preserve collections data.

**Solution:**

1. **Check your environment variables:**
   ```bash
   node check-env.js
   ```

2. **Get your Supabase Service Role Key:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to **Settings** > **API**
   - Copy the **service_role** key (⚠️ Keep this secure!)

3. **Set the environment variable:**

   **For PM2 (production):**
   ```bash
   pm2 stop over-the-hill
   pm2 set SUPABASE_SERVICE_ROLE_KEY "your_service_role_key_here"
   pm2 restart over-the-hill
   ```

   **For Docker:**
   ```bash
   docker run -e SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here" ...
   ```

   **For local development:**
   Create `.env.local` file:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

4. **Verify the fix:**
   - Restart your application
   - Login to your account
   - Refresh the page
   - Collections data should persist

**Prevention:**
- Always run `node check-env.js` before deploying
- Include environment variable checks in your deployment pipeline
- Monitor application logs for authentication errors

---

## Authentication Issues

### Login/Logout Problems