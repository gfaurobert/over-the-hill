export const DOMAIN_ERROR_CODES = {
  noAccessToken: 'NO_ACCESS_TOKEN',
  noRefreshToken: 'NO_REFRESH_TOKEN',
  sessionExpired: 'SESSION_EXPIRED',
  sessionRefreshFailed: 'SESSION_REFRESH_FAILED',
  sessionValidationFailed: 'SESSION_VALIDATION_FAILED',
  rateLimited: 'RATE_LIMITED',
  timeout: 'TIMEOUT',
  networkError: 'NETWORK_ERROR',
  validationError: 'VALIDATION_ERROR',
  databaseError: 'DATABASE_ERROR',
  encryptionUnavailable: 'ENCRYPTION_UNAVAILABLE',
  unknown: 'UNKNOWN_ERROR'
} as const

export type DomainErrorCode = typeof DOMAIN_ERROR_CODES[keyof typeof DOMAIN_ERROR_CODES]

export interface DomainErrorShape {
  code: DomainErrorCode
  message: string
}

export function createDomainError(code: DomainErrorCode, message: string): DomainErrorShape {
  return { code, message }
}
