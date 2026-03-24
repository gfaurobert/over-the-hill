# ARCH Slop Advisory - Data & Type Reality

Generated at: `2026-03-23T21:18:24+01:00`  
Inputs: `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SLOP_TRENDS.md`

## Executive Risk View

The current architecture shows a high concentration of runtime type ambiguity at trust boundaries (auth/session, API routes, data services, cache/offline/privacy fallback). The dominant failure mode is not hard crashes; it is *plausible success with invalid or incomplete state*.

Primary risk pattern:

1. Untyped or inconsistently typed outcomes cross layers.
2. Fallback paths convert hard errors into weak signals (nullable/boolean/no-op).
3. Callers proceed under unsafe assumptions ("operation succeeded", "data is complete", "encryption is active", "cache is fresh").

This creates user-visible correctness drift that is hard to detect and harder to recover from.

## Runtime Type Issues and Unsafe Assumptions

## 1) Missing domain error model across boundaries (`ARCH-001`, `ARCH-003`)

**Issue**  
Errors appear to be represented differently by provider/service/route layers (throws, nulls, generic messages, booleans).

**Unsafe assumption**  
Any non-throw result is safe to continue with.

**Runtime effect**  
Distinct failure states collapse into generic handling; retries, logout decisions, and UI messaging become inconsistent.

**High-level mitigation**  
Adopt one discriminated union for *all boundary outcomes* and enforce mapping at each boundary.

Example error payload:

```json
{
  "ok": false,
  "error": {
    "code": "SESSION_REFRESH_FAILED",
    "message": "Refresh token rejected",
    "retryable": true,
    "boundary": "api/auth/refresh",
    "causeId": "auth-401",
    "meta": {
      "attempt": 2,
      "maxAttempts": 3
    }
  }
}
```

## 2) Fallback chains hide degraded mode (`ARCH-002`, `ARCH-007`, `ARCH-010`)

**Issue**  
Crypto/cache/offline fallbacks likely use implicit success semantics.

**Unsafe assumption**  
Fallback means equivalent behavior.

**Runtime effect**  
Stale reads, weaker privacy guarantees, or missed persistence can be treated as success.

**High-level mitigation**  
Replace boolean/null/no-op fallback signaling with explicit degraded outcomes that callers must branch on.

Example degraded read response:

```json
{
  "ok": true,
  "data": {
    "dots": []
  },
  "quality": {
    "mode": "DEGRADED",
    "source": "cache-only",
    "stalenessMs": 184000,
    "limitations": ["network-unavailable", "freshness-unverified"]
  }
}
```

## 3) Import/export lacks typed partial-failure semantics (`ARCH-004`)

**Issue**  
Batch import is naturally non-atomic but may return binary success/failure.

**Unsafe assumption**  
Import success means all entities were applied.

**Runtime effect**  
Hidden data loss or silent skips; poor retry UX.

**High-level mitigation**  
Return a typed import report with per-entity outcome and retry class.

Example import report:

```json
{
  "ok": false,
  "jobId": "imp_20260323_2118",
  "summary": {
    "created": 120,
    "updated": 37,
    "skipped": 9,
    "failed": 4
  },
  "failures": [
    {
      "entity": "dot",
      "entityId": "d_91",
      "code": "OWNERSHIP_VIOLATION",
      "retryable": false
    },
    {
      "entity": "snapshot",
      "entityId": "s_17",
      "code": "ENCRYPTION_UNAVAILABLE",
      "retryable": true
    }
  ]
}
```

## 4) Auth validation/refresh control flow has weak terminal typing (`ARCH-006`)

**Issue**  
Validation and refresh loops can oscillate without explicit terminal states and retry budget types.

**Unsafe assumption**  
Another retry is always the safest next action.

**Runtime effect**  
Looping requests, unclear UX actions, session churn.

**High-level mitigation**  
Model auth flow as a state machine with typed terminal outcomes and bounded retries.

Example terminal outcome:

```json
{
  "ok": false,
  "authState": "REAUTH_REQUIRED",
  "reason": "MAX_REFRESH_ATTEMPTS_REACHED",
  "attempts": 3,
  "nextAction": "PROMPT_LOGIN"
}
```

## 5) Dual service facades amplify contract drift (`ARCH-005`, `ARCH-009`, `ARCH-008`)

**Issue**  
Parallel facades (`simple` vs `cached`) and mixed invocation styles can diverge in runtime contracts.

**Unsafe assumption**  
Both facades normalize errors and nullability identically.

**Runtime effect**  
Environment-dependent bugs, SSR/browser semantic mismatch, inconsistent catch boundaries.

**High-level mitigation**  
Converge to one runtime facade and one invocation style; define a single public contract and enforce it in tests across SSR and browser adapters.

## Mitigation Blueprint (High-Level, Sequence)

1. Define canonical result contract:
   - `Result<TData, TError>` with discriminants (`ok`, `error.code`, `quality.mode`, `authState`).
2. Add boundary mappers:
   - Route -> service mapper, service -> UI mapper, fallback -> degraded mapper.
3. Replace implicit outcomes:
   - Eliminate nullable/boolean/no-op success semantics in critical paths.
4. Enforce at compile + runtime:
   - Type-level exhaustiveness checks and runtime schema validation (for inbound/outbound JSON boundaries).
5. Improve observability:
   - Emit structured events for degraded mode, partial success, terminal auth states.
6. Collapse duplicate facades:
   - Keep one active data service path and retire drift-prone duplicates.

## Priority Focus (Next Iteration)

- **P0**: Error taxonomy + boundary result contract (`ARCH-001`, `ARCH-003`)
- **P0**: Degraded-mode explicit signaling in fallback-heavy paths (`ARCH-002`)
- **P1**: Typed partial import report + retry classes (`ARCH-004`)
- **P1**: Auth terminal state machine with retry budget (`ARCH-006`)
- **P2**: Facade convergence and SSR/browser semantic alignment (`ARCH-005`, `ARCH-008`, `ARCH-009`)

## Success Criteria

- No critical boundary returns plain boolean/null to represent operational outcome.
- All auth/data/privacy/cache boundaries emit discriminated, machine-readable outcomes.
- Import/export surfaces partial success explicitly with retryability.
- UI recovery actions map directly from typed terminal outcomes, not string matching.

