import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDebugIngestEvent } from './lib/debug-ingest';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/collections',
  '/dots'
];

// Auth routes that should redirect if already authenticated
const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/reset-password',
  '/invite'
];

// Rate limiting for proxy validation
// TODO: For production/distributed environments, replace this in-memory Map with Redis
// to handle rate limiting across multiple instances
const validationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_PROXY_ATTEMPTS = 20;
const PROXY_WINDOW_MS = 60 * 1000; // 1 minute

// Cleanup function to remove stale entries
function cleanupValidationAttempts(): void {
  const now = Date.now();
  for (const [ip, entry] of validationAttempts.entries()) {
    if (now - entry.lastAttempt > PROXY_WINDOW_MS) {
      validationAttempts.delete(ip);
    }
  }
}

function isProxyRateLimited(clientIP: string): boolean {
  // Cleanup stale entries before processing
  cleanupValidationAttempts();
  
  const now = Date.now();
  const attempts = validationAttempts.get(clientIP);
  
  if (!attempts) {
    validationAttempts.set(clientIP, { count: 1, lastAttempt: now });
    return false;
  }
  
  // Reset if window has passed
  if (now - attempts.lastAttempt > PROXY_WINDOW_MS) {
    validationAttempts.set(clientIP, { count: 1, lastAttempt: now });
    return false;
  }
  
  // Increment attempts
  attempts.count++;
  attempts.lastAttempt = now;
  
  return attempts.count > MAX_PROXY_ATTEMPTS;
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

function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get token from cookies
  const tokenCookie = request.cookies.get('sb-access-token');
  if (tokenCookie) {
    return tokenCookie.value;
  }
  
  // Try alternative cookie name
  const altTokenCookie = request.cookies.get('supabase-auth-token');
  if (altTokenCookie) {
    return altTokenCookie.value;
  }
  
  return null;
}

async function validateTokenServerSide(token: string): Promise<{ valid: boolean; user?: any }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    (() => {
      let parsed: { origin?: string; host?: string; port?: string; protocol?: string } = {};
      try {
        if (typeof supabaseUrl === 'string' && supabaseUrl.length > 0) {
          const url = new URL(supabaseUrl);
          parsed = { origin: url.origin, host: url.host, port: url.port, protocol: url.protocol };
        }
      } catch {
        // ignore parse errors
      }
      sendDebugIngestEvent({
        location: 'proxy.ts:validateTokenServerSide',
        message: 'validateTokenServerSide env snapshot',
        data: {
          hasSupabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!serviceRoleKey,
          parsed,
          supabaseUrlSample: typeof supabaseUrl === 'string' ? supabaseUrl.slice(0, 80) : null,
        },
        hypothesisId: 'D',
      });
    })();
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[Proxy] Missing Supabase environment variables');
      return { valid: false };
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { valid: false };
    }
    
    return { valid: true, user };
  } catch (error) {
    console.warn('[Proxy] Token validation error:', error);
    return { valid: false };
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);
  
  // Skip proxy for API routes, static files, and internal Next.js routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Check rate limiting
  if (isProxyRateLimited(clientIP)) {
    console.warn(`[Proxy] Rate limit exceeded for IP: ${clientIP}`);
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  
  // Get token from request
  const token = getTokenFromRequest(request);
  
  let isAuthenticated = false;
  let user = null;
  
  if (token) {
    const validation = await validateTokenServerSide(token);
    isAuthenticated = validation.valid;
    user = validation.user;
  }
  
  // Handle protected routes
  if (isProtectedRoute && !isAuthenticated) {
    console.log(`[Proxy] Redirecting unauthenticated user from ${pathname} to /login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Handle auth routes when already authenticated
  if (isAuthRoute && isAuthenticated) {
    console.log(`[Proxy] Redirecting authenticated user from ${pathname} to /dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Add security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add user context to headers if authenticated (for debugging)
  if (isAuthenticated && user) {
    response.headers.set('X-User-Authenticated', 'true');
  } else {
    response.headers.set('X-User-Authenticated', 'false');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

