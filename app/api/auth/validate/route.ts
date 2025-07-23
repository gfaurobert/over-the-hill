import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateUserId } from '@/lib/validation';

// Rate limiting for session validation
const validationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_VALIDATION_ATTEMPTS = 10;
const VALIDATION_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const attempts = validationAttempts.get(clientIP);
  
  if (!attempts) {
    validationAttempts.set(clientIP, { count: 1, lastAttempt: now });
    return false;
  }
  
  // Reset if window has passed
  if (now - attempts.lastAttempt > VALIDATION_WINDOW_MS) {
    validationAttempts.set(clientIP, { count: 1, lastAttempt: now });
    return false;
  }
  
  // Increment attempts
  attempts.count++;
  attempts.lastAttempt = now;
  
  return attempts.count > MAX_VALIDATION_ATTEMPTS;
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

// Create server-side Supabase client with service role for validation
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for server-side validation');
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
    if (isRateLimited(clientIP)) {
      console.warn(`[Session Validation] Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Too many validation attempts. Please try again later.',
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { accessToken, refreshToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Access token is required',
          code: 'MISSING_TOKEN'
        },
        { status: 400 }
      );
    }

    // Create server-side Supabase client
    const supabase = createServerSupabaseClient();

    // Validate the access token by getting user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.warn(`[Session Validation] Invalid token for IP: ${clientIP}`, userError?.message);
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired session',
          code: 'INVALID_SESSION'
        },
        { status: 401 }
      );
    }

    // Validate user ID format
    try {
      validateUserId(user.id);
    } catch (validationError) {
      console.warn(`[Session Validation] Invalid user ID format: ${user.id}`);
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid user data',
          code: 'INVALID_USER_DATA'
        },
        { status: 400 }
      );
    }

    // Additional security checks
    const now = new Date();
    const userCreated = new Date(user.created_at);
    
    // Check if user account is suspiciously new (potential security risk)
    const accountAgeMinutes = (now.getTime() - userCreated.getTime()) / (1000 * 60);
    if (accountAgeMinutes < 1) {
      console.warn(`[Session Validation] Suspiciously new account: ${user.id}`);
    }

    // Check if user has required fields
    if (!user.email && !user.phone) {
      console.warn(`[Session Validation] User missing email/phone: ${user.id}`);
      return NextResponse.json(
        {
          valid: false,
          error: 'Incomplete user profile',
          code: 'INCOMPLETE_PROFILE'
        },
        { status: 400 }
      );
    }

    // Verify token expiry if available in JWT payload
    let tokenExpiry: number | undefined;
    try {
      if (accessToken.includes('.')) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        tokenExpiry = payload.exp ? payload.exp * 1000 : undefined; // Convert to milliseconds
        
        if (tokenExpiry && tokenExpiry < Date.now()) {
          return NextResponse.json(
            {
              valid: false,
              error: 'Token has expired',
              code: 'TOKEN_EXPIRED'
            },
            { status: 401 }
          );
        }
      }
    } catch (jwtError) {
      // JWT parsing failed, but user validation succeeded, so continue
      console.warn(`[Session Validation] JWT parsing failed but user valid: ${user.id}`);
    }

    console.log(`[Session Validation] Valid session for user: ${user.id} from IP: ${clientIP}`);

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      session: {
        expires_at: tokenExpiry,
        access_token: accessToken
      },
      validatedAt: now.toISOString()
    });

  } catch (error) {
    console.error('[Session Validation] Server error:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Internal server error during validation',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for session validation.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for session validation.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for session validation.' },
    { status: 405 }
  );
}