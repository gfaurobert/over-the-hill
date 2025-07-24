import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

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
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
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