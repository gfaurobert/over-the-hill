interface ValidationResponse {
  valid: boolean;
  error?: string;
  code?: string;
  user?: {
    id: string;
    email: string;
    created_at: string;
  };
  session?: {
    expires_at?: number;
    access_token?: string;
  };
}

interface RefreshResponse {
  success: boolean;
  error?: string;
  code?: string;
  session?: {
    expires_at?: number;
    access_token?: string;
    refresh_token?: string;
  };
  user?: {
    id: string;
    email: string;
  };
  refreshedAt?: string;
}

class SessionValidationService {
  private static instance: SessionValidationService;
  private validationCache = new Map<string, { result: ValidationResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds
  private readonly REQUEST_TIMEOUT = 10 * 1000; // 10 seconds
  private validationPromise: Promise<ValidationResponse> | null = null;
  private refreshPromise: Promise<RefreshResponse> | null = null;

  private constructor() {}

  static getInstance(): SessionValidationService {
    if (!SessionValidationService.instance) {
      SessionValidationService.instance = new SessionValidationService();
    }
    return SessionValidationService.instance;
  }

  /**
   * Get stored tokens from localStorage or sessionStorage
   */
  private getStoredTokens(): { accessToken?: string; refreshToken?: string } {
    try {
      // Check NEXT_PUBLIC_SUPABASE_URL validity before parsing
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      let localStorageSession = null;
      if (typeof supabaseUrl === 'string' && supabaseUrl.length > 0 && supabaseUrl.includes('//')) {
        const urlPart = supabaseUrl.split('//')[1]?.split('.')[0];
        if (urlPart) {
          localStorageSession = localStorage.getItem('sb-' + urlPart + '-auth-token');
        }
      }
      if (localStorageSession) {
        const session = JSON.parse(localStorageSession);
        return {
          accessToken: session.access_token,
          refreshToken: session.refresh_token
        };
      }

      // Try alternative storage format
      const altSession = localStorage.getItem('supabase.auth.token');
      if (altSession) {
        const session = JSON.parse(altSession);
        return {
          accessToken: session.access_token,
          refreshToken: session.refresh_token
        };
      }

      return {};
    } catch (error) {
      console.warn('[SESSION_VALIDATION] Failed to retrieve stored tokens:', error);
      return {};
    }
  }

  /**
   * Validates the current session server-side
   */
  async validateSession(accessToken?: string, refreshToken?: string): Promise<ValidationResponse> {
    // Return existing promise if validation is already in progress
    if (this.validationPromise) {
      console.log('[SESSION_VALIDATION] Using existing validation promise');
      return this.validationPromise;
    }

    const tokens = accessToken && refreshToken ? { accessToken, refreshToken } : this.getStoredTokens();
    
    if (!tokens.accessToken) {
      return {
        valid: false,
        error: 'No access token available',
        code: 'NO_ACCESS_TOKEN'
      };
    }

    // Create a stable cache key based on token hash
    const tokenHash = this.hashToken(tokens.accessToken);
    const cacheKey = `session_validation_${tokenHash}`;
    const cached = this.validationCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[SESSION_VALIDATION] Using cached validation result');
      return cached.result;
    }

    // Create validation promise with guaranteed accessToken
    const validationTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
    this.validationPromise = this.performValidation(validationTokens, cacheKey);
    
    try {
      const result = await this.validationPromise;
      return result;
    } finally {
      this.validationPromise = null;
    }
  }

  private async performValidation(tokens: { accessToken: string; refreshToken?: string }, cacheKey: string): Promise<ValidationResponse> {
    try {
      console.log('[SESSION_VALIDATION] Validating session server-side');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result: ValidationResponse = await response.json();
      
      // Cache the result
      this.validationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      if (!response.ok) {
        console.warn(`[SESSION_VALIDATION] Validation failed: ${result.error} (${result.code})`);
        
        // If server-side validation is not available, fall back to client-side validation
        if (result.code === 'SERVER_VALIDATION_UNAVAILABLE') {
          console.log('[SESSION_VALIDATION] Falling back to client-side validation');
          return await this.performClientSideValidation(tokens);
        }
        
        return result;
      }

      if (result.valid) {
        console.log(`[SESSION_VALIDATION] Session valid for user: ${result.user?.id}`);
      } else {
        console.warn(`[SESSION_VALIDATION] Session invalid: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('[SESSION_VALIDATION] Validation request failed:', error);
      
      // Clear cache on error
      this.validationCache.delete(cacheKey);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          valid: false,
          error: 'Session validation timeout',
          code: 'TIMEOUT'
        };
      }

      return {
        valid: false,
        error: 'Session validation failed',
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Create a simple hash of the token for cache key stability
   */
  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(token.length, 20); i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Performs client-side validation when server-side validation is not available
   */
  private async performClientSideValidation(tokens: { accessToken: string; refreshToken?: string }): Promise<ValidationResponse> {
    try {
      // Import supabase client dynamically to avoid SSR issues
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Get current user from client-side supabase
      const { data: { user }, error } = await supabase.auth.getUser(tokens.accessToken);
      
      if (error || !user) {
        console.warn('[SESSION_VALIDATION] Client-side validation failed:', error?.message);
        return {
          valid: false,
          error: error?.message || 'Invalid session',
          code: 'INVALID_SESSION'
        };
      }
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('[SESSION_VALIDATION] Client-side validation successful');
      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at || new Date().toISOString()
        },
        session: session ? {
          expires_at: session.expires_at,
          access_token: session.access_token
        } : undefined
      };
      
    } catch (error) {
      console.error('[SESSION_VALIDATION] Client-side validation error:', error);
      return {
        valid: false,
        error: 'Client-side validation failed',
        code: 'CLIENT_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Refreshes the current session server-side
   */
  async refreshSession(refreshToken?: string): Promise<RefreshResponse> {
    // Return existing promise if refresh is already in progress
    if (this.refreshPromise) {
      console.log('[SESSION_VALIDATION] Using existing refresh promise');
      return this.refreshPromise;
    }

    const tokens = this.getStoredTokens();
    const tokenToUse = refreshToken || tokens.refreshToken;

    if (!tokenToUse) {
      return {
        success: false,
        error: 'No refresh token available',
        code: 'NO_REFRESH_TOKEN'
      };
    }

    // Create refresh promise
    this.refreshPromise = this.performRefresh(tokenToUse);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refreshToken: string): Promise<RefreshResponse> {
    try {
      console.log('[SESSION_VALIDATION] Refreshing session server-side');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshToken
        }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result: RefreshResponse = await response.json();
      
      // Clear validation cache after refresh attempt
      this.clearValidationCache();

      if (!response.ok) {
        console.warn(`[SESSION_VALIDATION] Refresh failed: ${result.error} (${result.code})`);
        return result;
      }

      if (result.success) {
        console.log(`[SESSION_VALIDATION] Session refreshed for user: ${result.user?.id}`);
      } else {
        console.warn(`[SESSION_VALIDATION] Refresh unsuccessful: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('[SESSION_VALIDATION] Refresh request failed:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Session refresh timeout',
          code: 'TIMEOUT'
        };
      }

      return {
        success: false,
        error: 'Session refresh failed',
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Validates session with automatic refresh on expiry
   */
  async validateWithRefresh(): Promise<ValidationResponse> {
    const validation = await this.validateSession();
    
    // If session is expired, try to refresh
    if (!validation.valid && validation.code === 'SESSION_EXPIRED') {
      console.log('[SESSION_VALIDATION] Session expired, attempting refresh');
      
      const refresh = await this.refreshSession();
      
      if (refresh.success) {
        // Re-validate after successful refresh
        return await this.validateSession();
      } else {
        return {
          valid: false,
          error: 'Session expired and refresh failed',
          code: 'REFRESH_FAILED'
        };
      }
    }
    
    return validation;
  }

  /**
   * Checks if session is valid without network request (uses cache)
   */
  getCachedValidation(): ValidationResponse | null {
    const cached = this.validationCache.get('session_validation');
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    
    return null;
  }

  /**
   * Clears the validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
    console.log('[SESSION_VALIDATION] Validation cache cleared');
  }

  /**
   * Checks if session expires soon (within 5 minutes)
   */
  isSessionExpiringSoon(expiresAt?: number): boolean {
    if (!expiresAt) return false;
    
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;
    
    return (expiresAt - now) < fiveMinutes;
  }

  /**
   * Gets session expiry information
   */
  getSessionExpiryInfo(expiresAt?: number): {
    isExpired: boolean;
    isExpiringSoon: boolean;
    timeUntilExpiry?: number;
  } {
    if (!expiresAt) {
      return {
        isExpired: true,
        isExpiringSoon: true
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;
    
    return {
      isExpired: timeUntilExpiry <= 0,
      isExpiringSoon: timeUntilExpiry < 300, // 5 minutes
      timeUntilExpiry: Math.max(0, timeUntilExpiry)
    };
  }
}

export const sessionValidationService = SessionValidationService.getInstance();
export type { ValidationResponse, RefreshResponse };