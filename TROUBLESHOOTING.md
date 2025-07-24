# PWA Loading Issues - Troubleshooting Guide

## Problem: App Gets Stuck at "Loading..." Screen

If your PWA gets stuck at the loading screen but works fine in incognito mode, this is typically caused by cached authentication data that has become stale or corrupted.

### Why This Happens

1. **Stale Authentication Tokens**: Your browser has cached old authentication tokens in localStorage that are no longer valid
2. **Service Worker Cache**: The service worker may have cached outdated resources
3. **Browser Cache**: The browser's standard cache may contain stale data
4. **Session Validation Cache**: The app's internal validation cache may have invalid entries

### Quick Fixes

#### Option 1: Use the Built-in Clear Cache Button
When you see the loading screen, there should be a "Clear Cache & Reload" button. Click it to automatically clear all cached data and restart the app.

#### Option 2: Manual Browser Cache Clear
1. Open your browser's developer tools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In the left sidebar, find **Storage** or **Clear Storage**
4. Click **Clear site data** or similar option
5. Refresh the page

#### Option 3: Hard Refresh
1. Hold `Shift` and click the refresh button
2. Or use keyboard shortcuts:
   - **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

#### Option 4: Incognito/Private Mode (Temporary)
1. Open an incognito/private browsing window
2. Navigate to your app - it should work normally
3. This is a temporary solution; you'll need to clear cache in regular mode

### Prevention

To prevent this issue from happening again:

1. **Regular Updates**: Keep your browser updated
2. **Avoid Force-Closing**: Don't force-close the browser while the app is running
3. **Stable Network**: Ensure stable internet connection during authentication
4. **Clear Cache Periodically**: Manually clear cache if you notice any issues

### For Developers

The app now includes several mechanisms to prevent and recover from stuck loading states:

1. **Automatic Timeout**: Loading state automatically clears after 10 seconds with cache cleanup
2. **Failure Recovery**: After 3 consecutive validation failures, all auth data is cleared
3. **Service Worker Management**: Proper cache management and cleanup
4. **Manual Recovery**: Clear cache button available during loading state

### Still Having Issues?

If the problem persists after trying all the above solutions:

1. Check browser console for error messages
2. Try a different browser
3. Ensure JavaScript is enabled
4. Check if you have any browser extensions that might interfere
5. Contact support with browser version and console error details

### Technical Details

The loading issue is primarily caused by:
- Corrupted localStorage entries for Supabase authentication
- Stale session validation cache (30-second TTL)
- Service worker cache mismatches
- Network request failures during authentication validation

The app now automatically detects and recovers from these states, but manual intervention may sometimes be necessary.