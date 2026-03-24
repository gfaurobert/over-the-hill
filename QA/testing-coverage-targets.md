# Testing Coverage Targets

## Coverage Gates

- Global unit-test coverage gate: `>= 70%` for statements, branches, functions, and lines.
- Critical logic gate: `>= 90%` for statements, branches, functions, and lines.

## Critical Logic Modules

- `lib/validation.ts`
  - Input sanitization and schema guards
  - Import payload validation and reject paths
  - Preference update validation and fallback defaults
- `lib/services/sessionValidationService.ts`
  - Session validation success/failure flow
  - Token refresh retries and network failure handling
  - Cache, expiry, dedupe, and fail-closed behavior
- `lib/services/cacheInvalidationRules.ts`
  - Invalidating dependent cache keys from mutations
  - Pattern replacement and parsing edge-cases
  - Rule manager singleton behavior

## Branches We Explicitly Test

- Valid vs invalid inputs.
- Success vs failure responses from async dependencies.
- Retry paths: first try, retry exhaustion, and fallback.
- Rate-limit/network errors vs unknown errors.
- Cached value hit vs cache miss vs stale value.
- Invalid/malformed persisted state.

