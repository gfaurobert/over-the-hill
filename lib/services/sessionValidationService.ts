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
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  private constructor() {}

  static getInstance(): SessionValidationService {
    if (!SessionValidationService.instance) {
      SessionValidationService.instance = new SessionValidationService();
    }
    return SessionValidationService.instance;
  }

  /**
   * Clear all authentication-related data and reset service state
   */
  clearAllAuthData(): void {
    try {
      console.log('[SESSION_VALIDATION] Clearing all authentication data');
      
      // Clear validation cache
      this.validationCache.clear();
      
      // Reset failure counter
      this.consecutiveFailures = 0;
      
      // Cancel any pending promises
      this.validationPromise = null;
      this.refreshPromise = null;
      
      // Clear localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('[SESSION_VALIDATION] Authentication data cleared successfully');
    } catch (error) {
      console.error('[SESSION_VALIDATION] Error clearing auth data:', error);
    }
  }

  /**
   * Check if service is in a stuck state and needs recovery
   */
  isStuckState(): boolean {
    return this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES;
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
   * Validate session with rate limiting awareness and exponential backoff
   * Can be called with tokens or will use stored tokens
   */
  async validateSession(accessToken?: string, refreshToken?: string): Promise<ValidationResponse> {
    try {
      // If no tokens provided, get them from storage
      if (!accessToken) {
        const storedTokens = this.getStoredTokens();
        if (!storedTokens.accessToken) {
          return {
            valid: false,
            error: 'No access token available',
            code: 'NO_ACCESS_TOKEN'
          };
        }
        accessToken = storedTokens.accessToken;
        refreshToken = storedTokens.refreshToken;
      }

      // Check cache first
      const cacheKey = `${accessToken}_${refreshToken || 'no_refresh'}`;
      const cached = this.validationCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        console.log('[SESSION_VALIDATION] Using cached validation result');
        return cached.result;
      }

      // If there's a pending validation, wait for it
      if (this.validationPromise) {
        console.log('[SESSION_VALIDATION] Waiting for pending validation');
        return await this.validationPromise;
      }

      // Create new validation promise
      this.validationPromise = this.performValidation(accessToken, refreshToken);
      const result = await this.validationPromise;
      
      // Cache successful results
      if (result.valid) {
        this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
      }
      
      return result;
    } catch (error) {
      console.error('[SESSION_VALIDATION] Validation error:', error);
      throw error;
    } finally {
      this.validationPromise = null;
    }
  }

  /**
   * Perform actual validation with rate limiting handling
   */
  private async performValidation(accessToken: string, refreshToken?: string): Promise<ValidationResponse> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken })
        });

        if (response.status === 429) {
          // Rate limited - handle gracefully
          const errorData = await response.json();
          const retryAfter = errorData.retryAfter || 60;
          
          console.warn(`[SESSION_VALIDATION] Rate limited, retrying after ${retryAfter} seconds`);
          
          if (retryCount < maxRetries - 1) {
            // Wait before retry with exponential backoff
            const waitTime = Math.min(retryAfter * 1000, Math.pow(2, retryCount) * 1000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          } else {
            // Max retries reached
            return {
              valid: false,
              error: 'Session validation rate limited. Please try again later.',
              code: 'RATE_LIMITED'
            };
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`[SESSION_VALIDATION] Validation attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries - 1) {
          // Exponential backoff for other errors
          const waitTime = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
        } else {
          throw error;
        }
      }
    }

    throw new Error('Max validation retries exceeded');
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
      console.log('[SESSION_VALIDATION] Performing client-side validation fallback');
      
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
      
      // Reset consecutive failures on successful client-side validation
      this.consecutiveFailures = 0;
      
      console.log('[SESSION_VALIDATION] Client-side validation successful');
      const result: ValidationResponse = {
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
      
      // Cache the successful client-side validation result
      const tokenHash = this.hashToken(tokens.accessToken);
      const cacheKey = `session_validation_${tokenHash}`;
      this.validationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;
      
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
  getCachedValidation(token?: string): ValidationResponse | null {
    if (!token) return null;
    const tokenHash = this.hashToken(token);
    const cacheKey = `session_validation_${tokenHash}`;
    const cached = this.validationCache.get(cacheKey);
    
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