import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendDebugIngestEvent } from './debug-ingest';

let supabaseInstance: SupabaseClient | null = null;

function createLoggedSupabaseFetch(supabaseUrl: string): typeof fetch {
  const supabaseOrigin = (() => {
    try {
      return new URL(supabaseUrl).origin;
    } catch {
      return supabaseUrl;
    }
  })();

  function getRetryUrl(originalUrl: string): string | null {
    try {
      const parsed = new URL(originalUrl);
      const isLoopbackHost = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
      if (!isLoopbackHost) return null;
      if (typeof window === "undefined") return null;

      // If the app is accessed via a different hostname (SSH tunnel / remote dev),
      // the browser's 127.0.0.1 points to the *user's* machine, not the server running Supabase.
      // Prefer the current page hostname for retries.
      const pageHost = window.location.hostname;
      if (pageHost && pageHost !== parsed.hostname) {
        parsed.hostname = pageHost;
        return parsed.toString();
      }

      // Fallback: some environments treat localhost/127.0.0.1 differently.
      if (parsed.hostname === "127.0.0.1") {
        parsed.hostname = "localhost";
        return parsed.toString();
      }

      return null;
    } catch {
      return null;
    }
  }

  // #region agent log
  let tokenRequestCount = 0;
  // #endregion

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method =
      init?.method ??
      (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");

    const isTokenRequest = typeof url === "string" && url.includes("/auth/v1/token");
    const shouldLog =
      typeof url === "string" &&
      (url.startsWith(supabaseOrigin) || url.includes("/auth/v1/")) &&
      (url.includes("/auth/v1/token") || url.includes("/auth/v1/"));

    if (isTokenRequest) {
      tokenRequestCount += 1;
      fetch('http://127.0.0.1:7249/ingest/685368f0-06f2-47f7-9f0b-ce960e48801d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabaseClient.ts:fetch',message:'auth token request',data:{tokenRequestCount,method,urlSnippet:url.slice(0,120),timestamp:Date.now()},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    }

    if (shouldLog) {
      sendDebugIngestEvent({
        location: 'lib/supabaseClient.ts:createLoggedSupabaseFetch',
        message: 'supabase fetch start',
        data: { method, url: url.slice(0, 200), supabaseOrigin },
        hypothesisId: 'B',
      });
    }

    try {
      const response = await fetch(input as any, init);
      if (isTokenRequest) {
        fetch('http://127.0.0.1:7249/ingest/685368f0-06f2-47f7-9f0b-ce960e48801d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabaseClient.ts:fetch',message:'auth token response',data:{tokenRequestCount,status:response.status,status429:response.status===429,timestamp:Date.now()},timestamp:Date.now(),hypothesisId:response.status===429?'B':'A'})}).catch(()=>{});
      }
      if (shouldLog) {
        sendDebugIngestEvent({
          location: 'lib/supabaseClient.ts:createLoggedSupabaseFetch',
          message: 'supabase fetch end',
          data: { method, url: url.slice(0, 200), status: response.status, ok: response.ok },
          hypothesisId: 'C',
        });
      }
      return response;
    } catch (error) {
      const isRetryable =
        typeof window !== "undefined" &&
        error instanceof TypeError &&
        (error.message === "Failed to fetch" || error.message.toLowerCase().includes("fetch"));

      const retryUrl = typeof url === "string" ? getRetryUrl(url) : null;

      if (isRetryable && retryUrl && typeof input === "string") {
        sendDebugIngestEvent({
          location: 'lib/supabaseClient.ts:createLoggedSupabaseFetch',
          message: 'supabase fetch retrying with rewritten host',
          data: {
            method,
            originalUrl: url.slice(0, 200),
            retryUrl: retryUrl.slice(0, 200),
            pageOrigin: window.location.origin,
          },
          hypothesisId: 'E',
        });

        try {
          const retryResponse = await fetch(retryUrl, init);
          sendDebugIngestEvent({
            location: 'lib/supabaseClient.ts:createLoggedSupabaseFetch',
            message: 'supabase fetch retry result',
            data: {
              method,
              retryUrl: retryUrl.slice(0, 200),
              status: retryResponse.status,
              ok: retryResponse.ok,
            },
            hypothesisId: 'E',
          });
          return retryResponse;
        } catch (retryError) {
          sendDebugIngestEvent({
            location: 'lib/supabaseClient.ts:createLoggedSupabaseFetch',
            message: 'supabase fetch retry threw',
            data: {
              method,
              retryUrl: retryUrl.slice(0, 200),
              errorName: retryError instanceof Error ? retryError.name : typeof retryError,
              errorMessage: retryError instanceof Error ? retryError.message : String(retryError),
            },
            hypothesisId: 'E',
          });
          throw retryError;
        }
      }

      if (shouldLog) {
        sendDebugIngestEvent({
          location: 'lib/supabaseClient.ts:createLoggedSupabaseFetch',
          message: 'supabase fetch threw',
          data: {
            method,
            url: url.slice(0, 200),
            errorName: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          hypothesisId: 'B',
        });
      }
      throw error;
    }
  };
}

function getClientSupabaseUrl(supabaseUrl: string): string {
  if (typeof window === "undefined") return supabaseUrl;
  if (process.env.NODE_ENV !== "development") return supabaseUrl;

  try {
    const parsed = new URL(supabaseUrl);
    const isLoopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (!isLoopback) return supabaseUrl;

    // In remote dev / SSH port-forwarding, browser loopback doesn't reach server loopback.
    // Use same-origin, relying on next.config.mjs rewrites to proxy to local Supabase.
    return window.location.origin;
  } catch {
    return supabaseUrl;
  }
}

// Mock Supabase client for server-side/build-time when env vars are missing
const createMockSupabaseClient = (): SupabaseClient => {
  const mockMethods = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
      insert: () => ({ select: () => ({ data: null, error: null }) }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ data: null, error: null })
    }),
    auth: {
      getUser: () => ({ data: { user: null }, error: null }),
      signOut: () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: null }, error: null })
    },
    storage: {
      from: () => ({
        upload: () => ({ data: null, error: null }),
        download: () => ({ data: null, error: null }),
        remove: () => ({ data: null, error: null })
      })
    }
  };

  return mockMethods as unknown as SupabaseClient;
};

const getSupabaseClient = (): SupabaseClient => {
  if (supabaseInstance) {
    sendDebugIngestEvent({
      location: 'lib/supabaseClient.ts:getSupabaseClient',
      message: 'getSupabaseClient cache hit',
      data: { hasInstance: true, isBrowser: typeof window !== 'undefined' },
      hypothesisId: 'B',
    });
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  (() => {
    let parsed: { origin?: string; host?: string; port?: string; protocol?: string } = {};
    try {
      if (typeof supabaseUrl === 'string' && supabaseUrl.length > 0) {
        const url = new URL(supabaseUrl);
        parsed = { origin: url.origin, host: url.host, port: url.port, protocol: url.protocol };
      }
    } catch {
      // ignore parse errors (we'll log what we can)
    }
    sendDebugIngestEvent({
      location: 'lib/supabaseClient.ts:getSupabaseClient',
      message: 'getSupabaseClient env snapshot',
      data: {
        hasSupabaseUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        supabaseUrlSample: typeof supabaseUrl === 'string' ? supabaseUrl.slice(0, 80) : null,
        parsed,
        nodeEnv: process.env.NODE_ENV,
        isBrowser: typeof window !== 'undefined',
      },
      hypothesisId: 'A',
    });
  })();

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time or when env vars are missing, return a mock client
    // This prevents build failures while still allowing the app to work in runtime
    if (typeof window === 'undefined') {
      // Server-side/build-time: create a proper mock
      return createMockSupabaseClient();
    }
    
    // Client-side: show a proper error with guidance
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(
      `Missing required Supabase environment variables: ${missingVars.join(', ')}\n\n` +
      'Please:\n' +
      '1. Copy .env.example to .env.local\n' +
      '2. Fill in your Supabase project URL and anon key\n' +
      '3. Restart the development server\n\n' +
      'Get these values from your Supabase project dashboard at https://supabase.com/dashboard'
    );
  }

  const clientSupabaseUrl = getClientSupabaseUrl(supabaseUrl);

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    sendDebugIngestEvent({
      location: 'lib/supabaseClient.ts:clientSupabaseUrl',
      message: 'client supabaseUrl selection',
      data: {
        envSupabaseUrlSample: typeof supabaseUrl === 'string' ? supabaseUrl.slice(0, 80) : null,
        clientSupabaseUrlSample: clientSupabaseUrl.slice(0, 80),
        pageOrigin: window.location.origin,
      },
      hypothesisId: 'E',
    });
  }

  supabaseInstance = createClient(clientSupabaseUrl, supabaseAnonKey, {
    global: {
      fetch: createLoggedSupabaseFetch(clientSupabaseUrl)
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  sendDebugIngestEvent({
    location: 'lib/supabaseClient.ts:getSupabaseClient',
    message: 'createClient called',
    data: { hasInstanceAfter: true, isBrowser: typeof window !== 'undefined' },
    hypothesisId: 'B',
  });
  
  // Log client initialization for debugging (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[Supabase Client] Initialized with URL:', supabaseUrl);
  }
  
  return supabaseInstance;
};

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
}); 