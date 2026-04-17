import { sessionValidationService } from '../sessionValidationService'
import { DOMAIN_ERROR_CODES } from '../domainErrors'

interface StorageRecord {
  [key: string]: string
}

function createLocalStorageMock(initial: StorageRecord = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    get length() {
      return store.size
    },
    clear: jest.fn(() => {
      store.clear()
    }),
    getItem: jest.fn((key: string) => store.get(key) ?? null),
    key: jest.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: jest.fn((key: string) => {
      store.delete(key)
    }),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value)
    }),
  } as unknown as Storage
}

describe('sessionValidationService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo-project.supabase.co',
    }
    Object.defineProperty(global, 'localStorage', {
      value: createLocalStorageMock(),
      writable: true,
    })
    ;(global as unknown as { fetch: jest.Mock }).fetch = jest.fn()
    sessionValidationService.clearAllAuthData()
    sessionValidationService.clearValidationCache()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns reauth_required when no access token exists', async () => {
    const result = await sessionValidationService.validateSession()
    expect(result).toMatchObject({
      valid: false,
      code: DOMAIN_ERROR_CODES.noAccessToken,
      terminalState: 'reauth_required',
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('uses validation cache for repeated token checks', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: true, user: { id: 'u1', email: 'u1@test.dev', created_at: 'now' } }),
    })

    const first = await sessionValidationService.validateSession('access-token', 'refresh-token')
    const second = await sessionValidationService.validateSession('access-token', 'refresh-token')

    expect(first.valid).toBe(true)
    expect(second.valid).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('moves to failed_closed after consecutive failures', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: false, error: 'bad' }),
    })

    const first = await sessionValidationService.validateSession('a1', 'r1')
    const second = await sessionValidationService.validateSession('a2', 'r2')
    const third = await sessionValidationService.validateSession('a3', 'r3')

    expect(first.terminalState).toBe('retryable')
    expect(second.terminalState).toBe('retryable')
    expect(third.terminalState).toBe('failed_closed')
    expect(sessionValidationService.isStuckState()).toBe(true)
  })

  it('returns noRefreshToken when refresh token is unavailable', async () => {
    const result = await sessionValidationService.refreshSession()
    expect(result).toMatchObject({
      success: false,
      code: DOMAIN_ERROR_CODES.noRefreshToken,
      terminalState: 'reauth_required',
    })
  })

  it('handles timeout abort during refresh request', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    ;(global.fetch as jest.Mock).mockRejectedValue(abortError)

    const result = await sessionValidationService.refreshSession('refresh-token')
    expect(result).toMatchObject({
      success: false,
      code: DOMAIN_ERROR_CODES.timeout,
      terminalState: 'retryable',
    })
  })

  it('validateWithRefresh retries validation after successful refresh', async () => {
    const sessionKey = 'sb-demo-project-auth-token'
    global.localStorage.setItem(
      sessionKey,
      JSON.stringify({
        access_token: 'seed-access-token',
        refresh_token: 'seed-refresh-token',
      }),
    )

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ valid: false, code: DOMAIN_ERROR_CODES.sessionExpired }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, terminalState: 'refreshed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ valid: true, user: { id: 'u1', email: 'u1@test.dev', created_at: 'now' } }),
      })

    const result = await sessionValidationService.validateWithRefresh()

    expect(result.valid).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe('/api/auth/refresh')
  })

  it('clears auth keys and resets stuck state on clearAllAuthData', async () => {
    global.localStorage.setItem('sb-demo-project-auth-token', '{"a":"1"}')
    global.localStorage.setItem('supabase.auth.token', '{"a":"1"}')
    global.localStorage.setItem('unrelated', 'keep')

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: false }),
    })

    await sessionValidationService.validateSession('a1')
    await sessionValidationService.validateSession('a2')
    await sessionValidationService.validateSession('a3')
    expect(sessionValidationService.isStuckState()).toBe(true)

    sessionValidationService.clearAllAuthData()

    expect(global.localStorage.getItem('sb-demo-project-auth-token')).toBeNull()
    expect(global.localStorage.getItem('supabase.auth.token')).toBeNull()
    expect(global.localStorage.getItem('unrelated')).toBe('keep')
    expect(sessionValidationService.isStuckState()).toBe(false)
  })

  it('uses alt local storage token format for validation', async () => {
    global.localStorage.setItem(
      'supabase.auth.token',
      JSON.stringify({ access_token: 'alt-access', refresh_token: 'alt-refresh' }),
    )
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: true }),
    })

    const result = await sessionValidationService.validateSession()
    expect(result.valid).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/validate',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('returns retryable rate limited error when max rate limit retries exhausted', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ retryAfter: 0 }),
    })

    const pending = sessionValidationService.validateSession('rate-limit-token')
    await jest.runAllTimersAsync()
    const result = await pending
    jest.useRealTimers()

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.rateLimited)
    expect(result.terminalState).toBe('retryable')
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('returns network error after repeated thrown validation failures', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network down'))
    const pending = sessionValidationService.validateSession('net-token')
    await jest.runAllTimersAsync()
    const result = await pending
    jest.useRealTimers()

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.networkError)
    expect(result.terminalState).toBe('retryable')
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('returns server refresh payload when refresh endpoint is non-ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: 'expired',
        code: DOMAIN_ERROR_CODES.sessionExpired,
        terminalState: 'reauth_required',
      }),
    })

    const result = await sessionValidationService.refreshSession('refresh-token')
    expect(result.success).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.sessionExpired)
  })

  it('deduplicates concurrent refresh calls through refreshPromise', async () => {
    let resolveFetch: ((value: unknown) => void) | null = null
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    const firstPromise = sessionValidationService.refreshSession('refresh-token')
    const secondPromise = sessionValidationService.refreshSession('refresh-token')

    resolveFetch?.({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })

    const [first, second] = await Promise.all([firstPromise, secondPromise])
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns sessionRefreshFailed when refresh cannot recover expired session', async () => {
    global.localStorage.setItem(
      'sb-demo-project-auth-token',
      JSON.stringify({
        access_token: 'seed-access-token',
        refresh_token: 'seed-refresh-token',
      }),
    )

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ valid: false, code: DOMAIN_ERROR_CODES.sessionExpired }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      })

    const result = await sessionValidationService.validateWithRefresh()
    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.sessionRefreshFailed)
    expect(result.terminalState).toBe('reauth_required')
  })

  it('supports cache lookup and expiry helper methods', () => {
    const serviceAny = sessionValidationService as unknown as {
      validationCache: Map<string, { result: { valid: boolean }; timestamp: number }>
      hashToken: (token: string) => string
    }
    const cacheKey = `session_validation_${serviceAny.hashToken('token-1')}`
    serviceAny.validationCache.set(cacheKey, {
      result: { valid: true },
      timestamp: Date.now(),
    })

    expect(sessionValidationService.getCachedValidation('token-1')).toEqual({ valid: true })
    expect(sessionValidationService.getCachedValidation('missing-token')).toBeNull()
    expect(sessionValidationService.isSessionExpiringSoon()).toBe(false)
    expect(sessionValidationService.isSessionExpiringSoon(Math.floor(Date.now() / 1000) + 120)).toBe(true)
    expect(sessionValidationService.getSessionExpiryInfo()).toEqual({
      isExpired: true,
      isExpiringSoon: true,
    })
  })

  it('handles malformed stored token JSON and logs warning', async () => {
    global.localStorage.setItem('supabase.auth.token', '{bad-json')
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    const result = await sessionValidationService.validateSession()

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.noAccessToken)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('deduplicates concurrent validateSession calls via validationPromise', async () => {
    let resolveFetch: ((value: unknown) => void) | null = null
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    const firstPromise = sessionValidationService.validateSession('same-access', 'same-refresh')
    const secondPromise = sessionValidationService.validateSession('same-access', 'same-refresh')

    resolveFetch?.({
      ok: true,
      status: 200,
      json: async () => ({ valid: true }),
    })

    const [first, second] = await Promise.all([firstPromise, secondPromise])
    expect(first.valid).toBe(true)
    expect(second.valid).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('rethrows when validateSession wrapper catches performValidation error', async () => {
    const serviceAny = sessionValidationService as unknown as {
      performValidation: () => Promise<unknown>
    }
    jest
      .spyOn(serviceAny, 'performValidation')
      .mockRejectedValueOnce(new Error('unexpected validation wrapper failure'))

    await expect(sessionValidationService.validateSession('x-access', 'x-refresh')).rejects.toThrow(
      'unexpected validation wrapper failure',
    )
  })

  it('handles HTTP non-ok validation responses with retries then network error', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    })

    const pending = sessionValidationService.validateSession('http-500-token')
    await jest.runAllTimersAsync()
    const result = await pending
    jest.useRealTimers()

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.networkError)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('covers exhausted loop fallback in performValidation edge case', async () => {
    const serviceAny = sessionValidationService as unknown as {
      MAX_VALIDATION_RETRIES: number
      performValidation: (accessToken: string, refreshToken?: string) => Promise<{ valid: boolean; code?: string }>
    }
    serviceAny.MAX_VALIDATION_RETRIES = 0
    const result = await serviceAny.performValidation('edge-access', 'edge-refresh')
    serviceAny.MAX_VALIDATION_RETRIES = 3

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.sessionValidationFailed)
  })

  it('returns initial validation when session is not expired in validateWithRefresh', async () => {
    global.localStorage.setItem(
      'sb-demo-project-auth-token',
      JSON.stringify({
        access_token: 'seed-access-token',
        refresh_token: 'seed-refresh-token',
      }),
    )
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: false, code: DOMAIN_ERROR_CODES.validationError }),
    })

    const result = await sessionValidationService.validateWithRefresh()

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.validationError)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns retryable network error for non-abort refresh failures', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('socket closed'))

    const result = await sessionValidationService.refreshSession('refresh-token')

    expect(result.success).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.networkError)
    expect(result.terminalState).toBe('retryable')
  })

  it('logs refresh unsuccessful when endpoint returns success false with ok response', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: 'stale refresh' }),
    })

    const result = await sessionValidationService.refreshSession('refresh-token')

    expect(result.success).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith('[SESSION_VALIDATION] Refresh unsuccessful: stale refresh')
  })

  it('handles client-side validation fallback success and cache insertion', async () => {
    jest.resetModules()
    jest.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'u-client', email: 'client@test.dev', created_at: '2024-01-01T00:00:00.000Z' } },
            error: null,
          }),
          getSession: jest.fn().mockResolvedValue({
            data: { session: { expires_at: 9999999999, access_token: 'client-access' } },
          }),
        },
      },
    }))

    const { sessionValidationService: serviceFromIsolatedModule } = await import('../sessionValidationService')
    const serviceAny = serviceFromIsolatedModule as unknown as {
      performClientSideValidation: (tokens: { accessToken: string; refreshToken?: string }) => Promise<{
        valid: boolean
      }>
      getCachedValidation: (token?: string) => { valid: boolean } | null
    }

    const result = await serviceAny.performClientSideValidation({ accessToken: 'client-access' })

    expect(result.valid).toBe(true)
    expect(serviceAny.getCachedValidation('client-access')).toMatchObject({ valid: true })
    jest.dontMock('@/lib/supabaseClient')
  })

  it('handles client-side validation fallback failure and thrown error branches', async () => {
    jest.resetModules()
    jest.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'user lookup failed' },
          }),
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      },
    }))

    const { sessionValidationService: serviceForFailure } = await import('../sessionValidationService')
    const failureAny = serviceForFailure as unknown as {
      performClientSideValidation: (tokens: { accessToken: string; refreshToken?: string }) => Promise<{
        valid: boolean
        code?: string
      }>
    }

    const failedResult = await failureAny.performClientSideValidation({ accessToken: 'bad-access' })
    expect(failedResult.valid).toBe(false)
    expect(failedResult.code).toBe(DOMAIN_ERROR_CODES.sessionValidationFailed)

    jest.resetModules()
    jest.doMock('@/lib/supabaseClient', () => {
      throw new Error('import failed')
    })
    const { sessionValidationService: serviceForThrow } = await import('../sessionValidationService')
    const throwAny = serviceForThrow as unknown as {
      performClientSideValidation: (tokens: { accessToken: string; refreshToken?: string }) => Promise<{
        valid: boolean
        code?: string
      }>
    }

    const thrownResult = await throwAny.performClientSideValidation({ accessToken: 'throw-access' })
    expect(thrownResult.valid).toBe(false)
    expect(thrownResult.code).toBe(DOMAIN_ERROR_CODES.networkError)
    jest.dontMock('@/lib/supabaseClient')
  })

  it('handles clearAllAuthData errors gracefully', () => {
    const errorStorage = {
      get length() {
        throw new Error('storage blocked')
      },
      getItem: jest.fn(),
      key: jest.fn(),
      removeItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn(),
    } as unknown as Storage

    Object.defineProperty(global, 'localStorage', {
      value: errorStorage,
      writable: true,
    })
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    sessionValidationService.clearAllAuthData()

    expect(errorSpy).toHaveBeenCalled()
  })

  it('returns detailed session expiry info for active session', () => {
    const now = Math.floor(Date.now() / 1000)
    const result = sessionValidationService.getSessionExpiryInfo(now + 600)

    expect(result.isExpired).toBe(false)
    expect(result.isExpiringSoon).toBe(false)
    expect(result.timeUntilExpiry).toBeGreaterThan(0)
  })

  it('uses no token path when supabase url is malformed', async () => {
    process.env = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-valid-url',
    }
    global.localStorage.setItem(
      'sb-demo-project-auth-token',
      JSON.stringify({ access_token: 'not-used', refresh_token: 'not-used' }),
    )

    const result = await sessionValidationService.validateSession()

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.noAccessToken)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns failed_closed after repeated network failures when already degraded', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: false }),
    })
    await sessionValidationService.validateSession('seed-a1')
    await sessionValidationService.validateSession('seed-a2')

    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network still down'))
    const pending = sessionValidationService.validateSession('seed-a3')
    await jest.runAllTimersAsync()
    const result = await pending
    jest.useRealTimers()

    expect(result.valid).toBe(false)
    expect(result.code).toBe(DOMAIN_ERROR_CODES.networkError)
    expect(result.terminalState).toBe('failed_closed')
  })

  it('returns null cache result when called without token', () => {
    expect(sessionValidationService.getCachedValidation()).toBeNull()
  })

  it('uses fallback created_at and no session in client-side validation result', async () => {
    jest.resetModules()
    jest.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'u-no-created-at', email: null, created_at: undefined } },
            error: null,
          }),
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      },
    }))

    const { sessionValidationService: serviceFromIsolatedModule } = await import('../sessionValidationService')
    const serviceAny = serviceFromIsolatedModule as unknown as {
      performClientSideValidation: (tokens: { accessToken: string; refreshToken?: string }) => Promise<{
        valid: boolean
        user?: { email: string; created_at: string }
        session?: unknown
      }>
    }

    const result = await serviceAny.performClientSideValidation({ accessToken: 'client-fallback-access' })

    expect(result.valid).toBe(true)
    expect(result.user?.email).toBe('')
    expect(typeof result.user?.created_at).toBe('string')
    expect(result.session).toBeUndefined()
    jest.dontMock('@/lib/supabaseClient')
  })

  it('returns the same singleton instance when getInstance is called directly', async () => {
    const { SessionValidationService, sessionValidationService: fresh } = await import(
      '../sessionValidationService'
    )
    expect(SessionValidationService.getInstance()).toBe(fresh)
    expect(SessionValidationService.getInstance()).toBe(SessionValidationService.getInstance())
  })

  it('does not attempt to read a Supabase-scoped key when NEXT_PUBLIC_SUPABASE_URL has no host part', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '//'
    const storage = createLocalStorageMock()
    Object.defineProperty(global, 'localStorage', { value: storage, writable: true })

    const tokens = (sessionValidationService as unknown as {
      getStoredTokens: () => { accessToken?: string; refreshToken?: string }
    }).getStoredTokens()

    expect(tokens).toEqual({})
    const calls = (storage.getItem as jest.Mock).mock.calls.map((c) => c[0])
    expect(calls.some((k: string) => k?.startsWith?.('sb-'))).toBe(false)
  })

  it('uses "Session validation failed" fallback when fetch rejects with a non-Error value', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue('network-down')

    const result = await sessionValidationService.validateSession('token-non-error')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Session validation failed')
  })

  it('falls back to "Invalid session" when client-side validation returns no user and no error', async () => {
    jest.resetModules()
    jest.doMock('@/lib/supabaseClient', () => ({
      supabase: {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      },
    }))

    const { sessionValidationService: serviceFromIsolatedModule } = await import('../sessionValidationService')
    const serviceAny = serviceFromIsolatedModule as unknown as {
      performClientSideValidation: (tokens: { accessToken: string }) => Promise<{
        valid: boolean
        error?: string
      }>
    }

    const result = await serviceAny.performClientSideValidation({ accessToken: 'no-user-access' })

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid session')
    jest.dontMock('@/lib/supabaseClient')
  })

})
