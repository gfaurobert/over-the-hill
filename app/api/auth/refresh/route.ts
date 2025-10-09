import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting for session refresh
const refreshAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_REFRESH_ATTEMPTS = 5;
const REFRESH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isRefreshRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const attempts = refreshAttempts.get(clientIP);
  
  // Cleanup: Remove stale entry if window has passed
  if (attempts && (now - attempts.lastAttempt > REFRESH_WINDOW_MS)) {
    refreshAttempts.delete(clientIP);
  }

  const currentAttempts = refreshAttempts.get(clientIP);

  if (!currentAttempts) {
    refreshAttempts.set(clientIP, { count: 1, lastAttempt: now });
    return false;
  }
  
  // Increment attempts
  currentAttempts.count++;
  currentAttempts.lastAttempt = now;
  
  return currentAttempts.count > MAX_REFRESH_ATTEMPTS;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const remote = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (real) {
    return real.trim();
  }
  if (remote) {
    return remote.trim();
  }
  
  return 'unknown';
}

// Create server-side Supabase client for refresh operations
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for server-side refresh');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Check rate limiting
    if (isRefreshRateLimited(clientIP)) {
      console.warn(`[Session Refresh] Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many refresh attempts. Please try again later.',
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        },
        { status: 400 }
      );
    }

    // Create server-side Supabase client
    const supabase = createServerSupabaseClient();

    // Attempt to refresh the session
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      console.warn(`[Session Refresh] Refresh failed for IP: ${clientIP}`, error?.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to refresh session',
          code: 'REFRESH_FAILED'
        },
        { status: 401 }
      );
    }

    const { session, user } = data;

    // Verify the refreshed session
    if (!session.access_token || !session.refresh_token) {
      console.warn(`[Session Refresh] Invalid refreshed session for IP: ${clientIP}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid refreshed session',
          code: 'INVALID_REFRESHED_SESSION'
        },
        { status: 400 }
      );
    }

    // Additional security checks on refreshed user
    if (!user || !user.id) {
      console.warn(`[Session Refresh] No user data in refreshed session for IP: ${clientIP}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid user data in refreshed session',
          code: 'INVALID_USER_DATA'
        },
        { status: 400 }
      );
    }

    // Check if user has required fields
    if (!user.email && !user.phone) {
      console.warn(`[Session Refresh] User missing email/phone: ${user.id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Incomplete user profile',
          code: 'INCOMPLETE_PROFILE'
        },
        { status: 400 }
      );
    }

    // Parse token expiry from JWT if available
    let tokenExpiry: number | undefined;
    try {
      if (session.access_token.includes('.')) {
        // Properly decode base64url encoded JWT payload
        const parts = session.access_token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          // Convert base64url to base64 for atob()
          const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          // Add padding if needed
          const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
          const decodedPayload = JSON.parse(atob(padded));
          tokenExpiry = decodedPayload.exp ? decodedPayload.exp * 1000 : undefined; // Convert to milliseconds
        }
      }
    } catch (jwtError) {
      console.warn(`[Session Refresh] JWT parsing failed for user: ${user.id}`);
    }

    console.log(`[Session Refresh] Successfully refreshed session for user: ${user.id} from IP: ${clientIP}`);

    return NextResponse.json({
      success: true,
      session: {
        expires_at: tokenExpiry,
        access_token: session.access_token,
        refresh_token: session.refresh_token
      },
      user: {
        id: user.id,
        email: user.email
      },
      refreshedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Session Refresh] Server error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during refresh',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for session refresh.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for session refresh.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for session refresh.' },
    { status: 405 }
  );
}