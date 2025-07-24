import { ValidationError } from '@/lib/validation';

// Security configuration for imports
const IMPORT_SECURITY_CONFIG = {
  MAX_JSON_SIZE: 10 * 1024 * 1024, // 10MB max JSON size
  MAX_PARSE_DEPTH: 10, // Maximum object nesting depth
  RATE_LIMIT_ATTEMPTS: 5, // Max import attempts per user
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  SUSPICIOUS_PATTERNS: [
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<script/i,
    /eval\(/i,
    /function\s*\(/i,
    /constructor/i,
    /__proto__/i,
    /prototype/i
  ]
};

// Rate limiting storage
const importAttempts = new Map<string, { count: number; firstAttempt: number }>();

/**
 * Security service for import operations
 */
export class ImportSecurityService {
  
  /**
   * Check if user has exceeded import rate limit
   */
  static checkRateLimit(userId: string): { allowed: boolean; remainingAttempts: number; resetTime?: number } {
    const now = Date.now();
    const userAttempts = importAttempts.get(userId);
    
    // Clean up expired entries
    if (userAttempts && (now - userAttempts.firstAttempt) > IMPORT_SECURITY_CONFIG.RATE_LIMIT_WINDOW) {
      importAttempts.delete(userId);
    }
    
    const currentAttempts = importAttempts.get(userId);
    
    if (!currentAttempts) {
      // First attempt
      importAttempts.set(userId, { count: 1, firstAttempt: now });
      return { 
        allowed: true, 
        remainingAttempts: IMPORT_SECURITY_CONFIG.RATE_LIMIT_ATTEMPTS - 1 
      };
    }
    
    if (currentAttempts.count >= IMPORT_SECURITY_CONFIG.RATE_LIMIT_ATTEMPTS) {
      const resetTime = currentAttempts.firstAttempt + IMPORT_SECURITY_CONFIG.RATE_LIMIT_WINDOW;
      return { 
        allowed: false, 
        remainingAttempts: 0,
        resetTime 
      };
    }
    
    // Increment attempt count
    currentAttempts.count++;
    return { 
      allowed: true, 
      remainingAttempts: IMPORT_SECURITY_CONFIG.RATE_LIMIT_ATTEMPTS - currentAttempts.count 
    };
  }
  
  /**
   * Securely validate and parse localStorage data with protection against JSON bombs
   */
  static secureParseLocalStorageData(key: string, rawData: string): any {
    // Check size before parsing to prevent JSON bombs
    if (rawData.length > IMPORT_SECURITY_CONFIG.MAX_JSON_SIZE) {
      throw new ValidationError(`Data too large for key '${key}'. Maximum ${IMPORT_SECURITY_CONFIG.MAX_JSON_SIZE / 1024 / 1024}MB allowed`);
    }
    
    // Check for suspicious patterns before parsing
    for (const pattern of IMPORT_SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
      if (pattern.test(rawData)) {
        console.warn(`[IMPORT_SECURITY] Suspicious pattern detected in ${key}:`, pattern);
        throw new ValidationError(`Potentially malicious content detected in ${key}`);
      }
    }
    
    // Parse with depth protection
    let parsed: any;
    try {
      parsed = JSON.parse(rawData);
    } catch (error) {
      throw new ValidationError(`Invalid JSON format in ${key}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
    
    // Validate object depth to prevent prototype pollution
    this.validateObjectDepth(parsed, 0, key);
    
    return parsed;
  }
  
  /**
   * Validate object nesting depth to prevent stack overflow attacks
   */
  private static validateObjectDepth(obj: any, currentDepth: number, context: string): void {
    if (currentDepth > IMPORT_SECURITY_CONFIG.MAX_PARSE_DEPTH) {
      throw new ValidationError(`Object nesting too deep in ${context}. Maximum depth ${IMPORT_SECURITY_CONFIG.MAX_PARSE_DEPTH} allowed`);
    }
    
    if (obj && typeof obj === 'object') {
      // Check for prototype pollution attempts
      if (obj.hasOwnProperty('__proto__') || obj.hasOwnProperty('constructor') || obj.hasOwnProperty('prototype')) {
        throw new ValidationError(`Potentially malicious object properties detected in ${context}`);
      }
      
      // Recursively check nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.validateObjectDepth(obj[key], currentDepth + 1, context);
        }
      }
    }
  }
  
  /**
   * Validate localStorage key structure before processing
   */
  static validateLocalStorageKey(key: string, data: any): boolean {
    switch (key) {
      case 'collections':
        return Array.isArray(data) && data.every(item => 
          item && typeof item === 'object' && 
          typeof item.id === 'string' && 
          typeof item.name === 'string' &&
          Array.isArray(item.dots)
        );
        
      case 'snapshots':
        return Array.isArray(data) && data.every(item =>
          item && typeof item === 'object' &&
          typeof item.collectionId === 'string' &&
          typeof item.collectionName === 'string' &&
          Array.isArray(item.dots)
        );
        
      case 'dots':
        return Array.isArray(data) && data.every(item =>
          item && typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.name === 'string'
        );
        
      default:
        console.warn(`[IMPORT_SECURITY] Unknown localStorage key: ${key}`);
        return false;
    }
  }
  
  /**
   * Log import attempt for security monitoring
   */
  static logImportAttempt(userId: string, success: boolean, dataSize: number, error?: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      success,
      dataSize,
      error,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
    };
    
    console.log(`[IMPORT_SECURITY] Import attempt:`, logEntry);
    
    // In production, you might want to send this to a security monitoring service
    if (!success) {
      console.warn(`[IMPORT_SECURITY] Failed import attempt for user ${userId}:`, error);
    }
  }
  
  /**
   * Sanitize import data structure to remove any potentially dangerous properties
   */
  static sanitizeImportData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    // Remove dangerous properties
    const dangerousProps = ['__proto__', 'constructor', 'prototype', 'eval', 'function'];
    const sanitized = { ...data };
    
    dangerousProps.forEach(prop => {
      delete sanitized[prop];
    });
    
    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (sanitized.hasOwnProperty(key) && typeof sanitized[key] === 'object') {
        if (Array.isArray(sanitized[key])) {
          sanitized[key] = sanitized[key].map((item: any) => this.sanitizeImportData(item));
        } else {
          sanitized[key] = this.sanitizeImportData(sanitized[key]);
        }
      }
    }
    
    return sanitized;
  }
}

export default ImportSecurityService;