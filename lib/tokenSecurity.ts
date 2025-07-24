import { sanitizeString, ValidationError } from './validation';

// Token types supported by the application
export type TokenType = 'recovery' | 'signup' | 'invite' | 'email_change' | 'phone_change';

// Token validation result
export interface TokenValidationResult {
  isValid: boolean;
  token: string | null;
  email: string | null;
  type: TokenType | null;
  source: 'searchParams' | 'hashParams' | 'urlParams' | null;
  errors: string[];
}

// Security configuration for token handling
const TOKEN_SECURITY_CONFIG = {
  // Maximum token length (Supabase tokens are typically JWT format)
  MAX_TOKEN_LENGTH: 2048,
  // Minimum token length (reasonable minimum for security)
  MIN_TOKEN_LENGTH: 10,
  // Valid token pattern (base64url characters)
  TOKEN_PATTERN: /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/,
  // Maximum email length
  MAX_EMAIL_LENGTH: 254,
  // Email validation pattern
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Allowed token types
  ALLOWED_TYPES: ['recovery', 'signup', 'invite', 'email_change', 'phone_change'] as TokenType[],
  // Token expiry check (client-side validation for JWT tokens)
  ENABLE_EXPIRY_CHECK: true,
  // Maximum age for tokens (in milliseconds) - 1 hour default
  MAX_TOKEN_AGE: 60 * 60 * 1000,
};

/**
 * Sanitizes and validates a token string
 */
export const sanitizeToken = (token: string | null): string | null => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    // Basic sanitization
    const sanitized = sanitizeString(token.trim(), TOKEN_SECURITY_CONFIG.MAX_TOKEN_LENGTH);
    
    // Length validation
    if (sanitized.length < TOKEN_SECURITY_CONFIG.MIN_TOKEN_LENGTH) {
      throw new ValidationError('Token too short');
    }
    
    if (sanitized.length > TOKEN_SECURITY_CONFIG.MAX_TOKEN_LENGTH) {
      throw new ValidationError('Token too long');
    }
    
    // Pattern validation (basic format check)
    if (!TOKEN_SECURITY_CONFIG.TOKEN_PATTERN.test(sanitized)) {
      throw new ValidationError('Invalid token format');
    }
    
    return sanitized;
  } catch (error) {
    console.warn('Token sanitization failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

/**
 * Sanitizes and validates an email string
 */
export const sanitizeEmail = (email: string | null): string | null => {
  if (!email || typeof email !== 'string') {
    return null;
  }

  try {
    const sanitized = sanitizeString(email.trim().toLowerCase(), TOKEN_SECURITY_CONFIG.MAX_EMAIL_LENGTH);
    
    if (!TOKEN_SECURITY_CONFIG.EMAIL_PATTERN.test(sanitized)) {
      throw new ValidationError('Invalid email format');
    }
    
    return sanitized;
  } catch (error) {
    console.warn('Email sanitization failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

/**
 * Validates a token type
 */
export const validateTokenType = (type: string | null): TokenType | null => {
  if (!type || typeof type !== 'string') {
    return null;
  }
  
  const sanitizedType = type.trim().toLowerCase() as TokenType;
  
  if (TOKEN_SECURITY_CONFIG.ALLOWED_TYPES.includes(sanitizedType)) {
    return sanitizedType;
  }
  
  return null;
};

/**
 * Attempts to decode and validate JWT token expiry (client-side only)
 * This is for additional security but should not be relied upon solely
 */
export const validateTokenExpiry = (token: string): boolean => {
  if (!TOKEN_SECURITY_CONFIG.ENABLE_EXPIRY_CHECK) {
    return true; // Skip validation if disabled
  }
  
  try {
    // Basic JWT structure check (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true; // Not a JWT, let Supabase handle validation
    }
    
    // Decode payload (base64url)
    const payload = parts[1];
    const decodedPayload = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    // Check expiry
    if (decodedPayload.exp) {
      const expiryTime = decodedPayload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (currentTime > expiryTime) {
        console.warn('Token has expired (client-side check)');
        return false;
      }
    }
    
    // Check issued at time (additional security)
    if (decodedPayload.iat) {
      const issuedTime = decodedPayload.iat * 1000;
      const currentTime = Date.now();
      
      if (currentTime - issuedTime > TOKEN_SECURITY_CONFIG.MAX_TOKEN_AGE) {
        console.warn('Token is too old (client-side check)');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    // If we can't decode, let Supabase handle validation
    console.warn('Token expiry validation failed:', error);
    return true;
  }
};

/**
 * Securely extracts and validates tokens from URL parameters
 * Standardizes token extraction across the application
 */
export const extractAndValidateToken = (searchParams?: URLSearchParams): TokenValidationResult => {
  const result: TokenValidationResult = {
    isValid: false,
    token: null,
    email: null,
    type: null,
    source: null,
    errors: []
  };
  
  try {
    // Get URL parameters from multiple sources (in order of preference)
    const sources = [
      { name: 'searchParams' as const, params: searchParams },
      { name: 'urlParams' as const, params: new URLSearchParams(window.location.search) },
      { name: 'hashParams' as const, params: new URLSearchParams(window.location.hash.substring(1)) }
    ];
    
    let rawToken: string | null = null;
    let rawEmail: string | null = null;
    let rawType: string | null = null;
    let source: 'searchParams' | 'hashParams' | 'urlParams' | null = null;
    
    // Try to extract from each source
    for (const { name, params } of sources) {
      if (!params) continue;
      
      // Try different token parameter names
      const tokenCandidates = [
        params.get('token'),
        params.get('access_token'),
        params.get('refresh_token')
      ].filter(Boolean);
      
      if (tokenCandidates.length > 0 && !rawToken) {
        rawToken = tokenCandidates[0];
        rawEmail = params.get('email');
        rawType = params.get('type');
        source = name;
        break;
      }
    }
    
    // Validate extracted values
    if (!rawToken) {
      result.errors.push('No token found in URL parameters');
      return result;
    }
    
    // Sanitize and validate token
    const sanitizedToken = sanitizeToken(rawToken);
    if (!sanitizedToken) {
      result.errors.push('Invalid token format or content');
      return result;
    }
    
    // Validate token expiry (client-side check)
    if (!validateTokenExpiry(sanitizedToken)) {
      result.errors.push('Token has expired');
      return result;
    }
    
    // Sanitize email if provided
    const sanitizedEmail = rawEmail ? sanitizeEmail(rawEmail) : null;
    if (rawEmail && !sanitizedEmail) {
      result.errors.push('Invalid email format');
      // Don't return here - email might not be required for all token types
    }
    
    // Validate type if provided
    const validatedType = rawType ? validateTokenType(rawType) : null;
    
    // Success
    result.isValid = true;
    result.token = sanitizedToken;
    result.email = sanitizedEmail;
    result.type = validatedType;
    result.source = source;
    
    return result;
    
  } catch (error) {
    result.errors.push(`Token extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Security logging for token operations
 */
export const logTokenOperation = (
  operation: string, 
  success: boolean, 
  details?: Record<string, any>
): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    success,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    ...details
  };
  
  // In production, this should be sent to a secure logging service
  if (success) {
    console.log(`[TOKEN_SECURITY] ${operation} succeeded`, logEntry);
  } else {
    console.warn(`[TOKEN_SECURITY] ${operation} failed`, logEntry);
  }
};

/**
 * Rate limiting for token operations (simple client-side implementation)
 */
class TokenRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    
    return true;
  }
  
  getRemainingAttempts(identifier: string): number {
    const attempts = this.attempts.get(identifier) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }
}

export const tokenRateLimiter = new TokenRateLimiter();

/**
 * Secure token processing wrapper
 */
export const processTokenSecurely = async <T>(
  operation: string,
  tokenResult: TokenValidationResult,
  processor: (token: string, email?: string, type?: TokenType) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> => {
  
  // Validate token result
  if (!tokenResult.isValid || !tokenResult.token) {
    logTokenOperation(operation, false, { 
      errors: tokenResult.errors,
      source: tokenResult.source 
    });
    return { 
      success: false, 
      error: tokenResult.errors.join(', ') || 'Invalid token' 
    };
  }
  
  // Rate limiting check
  const identifier = tokenResult.email || tokenResult.token.substring(0, 10);
  if (!tokenRateLimiter.isAllowed(identifier)) {
    logTokenOperation(operation, false, { 
      error: 'Rate limit exceeded',
      identifier: identifier.substring(0, 5) + '...' // Partial identifier for logging
    });
    return { 
      success: false, 
      error: 'Too many attempts. Please try again later.' 
    };
  }
  
  try {
    const data = await processor(
      tokenResult.token, 
      tokenResult.email || undefined, 
      tokenResult.type || undefined
    );
    
    logTokenOperation(operation, true, { 
      source: tokenResult.source,
      hasEmail: !!tokenResult.email,
      type: tokenResult.type 
    });
    
    return { success: true, data };
    
  } catch (error) {
    logTokenOperation(operation, false, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      source: tokenResult.source 
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Operation failed' 
    };
  }
};