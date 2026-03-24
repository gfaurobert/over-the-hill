## ARCH SL0P Execution Plan

Execution order follows actionable priority queue from `slops/ARCH_SL0P_ACTIONABLE.json`.

### 1) ARCH-001
- Slop title: Missing explicit error taxonomy across auth/session/data/privacy boundaries
- Category: Missing domain errors
- Score: 10
- Chosen action type: Add invariant
- Files/modules affected: `lib/services/domainErrors.ts`, `lib/services/sessionValidationService.ts`, `lib/services/supabaseService.ts`
- Execution steps:
  1. Add a shared domain error code map and lightweight helper for consistent error shaping.
  2. Use shared codes in auth/session service return paths.
  3. Use shared codes in service-layer error wrapping paths.
- Risk assessment: low-medium; may affect error message/code values consumed by UI logs.
- Validation strategy: run focused tests and TypeScript/lint diagnostics to ensure no breaking signatures.

### 2) ARCH-002
- Slop title: Silent-failure risk from multi-layer fallback chains (crypto + cache + offline)
- Category: Silent failures
- Score: 9
- Chosen action type: Add validation
- Files/modules affected: `lib/services/simpleDataService.ts`, `lib/services/cacheService.ts`
- Execution steps:
  1. Add explicit warning-level diagnostics for fallback/degraded outcomes at service boundaries.
  2. Ensure no silent no-op on unsupported options in simple service.
- Risk assessment: low; logging only, no behavior change.
- Validation strategy: static checks and existing service tests.

### 3) ARCH-003
- Slop title: Inconsistent error propagation between client provider, service facades, and API routes
- Category: Mismanaged propagation
- Score: 9
- Chosen action type: Consolidate
- Files/modules affected: `lib/services/sessionValidationService.ts`, `lib/services/supabaseService.ts`
- Execution steps:
  1. Consolidate to a consistent `code` contract in auth/session service error returns.
  2. Ensure service wrappers always include stable domain codes.
- Risk assessment: medium; callers may rely on previous ad-hoc codes.
- Validation strategy: TypeScript checks and focused auth/service smoke tests.

### 4) ARCH-006
- Slop title: Auth refresh/validation loop lacks explicit retry budget and terminal states
- Category: Mismanaged control flow
- Score: 8
- Chosen action type: Add invariant
- Files/modules affected: `lib/services/sessionValidationService.ts`
- Execution steps:
  1. Add explicit retry budget constants.
  2. Add terminal state tagging in validation responses for exhausted/final outcomes.
  3. Ensure no terminal path throws unexpectedly for known failure classes.
- Risk assessment: medium; changes auth flow error behavior.
- Validation strategy: run TypeScript/lint checks and ensure auth provider compiles unchanged.

### 5) ARCH-004
- Slop title: Import/export pipeline likely lacks partial-failure semantics
- Category: Missing domain errors
- Score: 8
- Chosen action type: Document intent
- Files/modules affected: `lib/services/supabaseService.ts`
- Execution steps:
  1. Add explicit in-code contract comments describing current all-or-nothing return shape.
  2. Mark partial snapshot import behavior as intentionally best-effort with clear warning semantics.
- Risk assessment: low; documentation-only clarity.
- Validation strategy: lint/type checks.

### 6) ARCH-005
- Slop title: Unused dual-service architecture (`simple` vs `cached`) increases error drift
- Category: Premature abstraction
- Score: 8
- Chosen action type: Document intent
- Files/modules affected: `lib/services/cachedDataService.ts`, `lib/services/simpleDataService.ts`
- Execution steps:
  1. Document canonical runtime service and migration intent in both service files.
  2. Add deprecation note for non-canonical exports without removing API.
- Risk assessment: low; no runtime changes.
- Validation strategy: lint/type checks.

### 7) ARCH-007
- Slop title: Cache subsystem breadth can mask cache-write/cache-invalidate failures
- Category: Silent failures
- Score: 7
- Chosen action type: Add invariant
- Files/modules affected: `lib/services/cacheService.ts`
- Execution steps:
  1. Add explicit operation diagnostics when invalidation rules resolve to no patterns.
  2. Add explicit warning when invalidate-by-operation does not match active rule set.
- Risk assessment: low; observability only.
- Validation strategy: existing cache tests and lint checks.

### 8) ARCH-010
- Slop title: Placeholder options/no-op API paths can imply successful handling when none occurred
- Category: Silent failures
- Score: 7
- Chosen action type: Add validation
- Files/modules affected: `lib/services/simpleDataService.ts`
- Execution steps:
  1. Validate and warn on unsupported options in simple service methods.
  2. Replace ambiguous no-op comments with explicit unsupported-operation diagnostics.
- Risk assessment: low; no signature changes.
- Validation strategy: run `simpleDataService` tests.

### 9) ARCH-008
- Slop title: SSR mock cache adapters risk diverging failure semantics from browser runtime
- Category: Mismanaged propagation
- Score: 6
- Chosen action type: Consolidate
- Files/modules affected: `lib/services/cacheService.ts`, `lib/services/cachedDataService.ts`
- Execution steps:
  1. Consolidate SSR mock adapters to shared helper semantics.
  2. Ensure SSR mock methods report degraded/no-cache behavior explicitly in logs.
- Risk assessment: medium; broad cache touchpoints.
- Validation strategy: lint/type checks and existing cache tests.

### 10) ARCH-009
- Slop title: "Class + singleton + bound exports" obscures ownership of throw/catch boundaries
- Category: Indirection without leverage
- Score: 6
- Chosen action type: Document intent
- Files/modules affected: `lib/services/simpleDataService.ts`, `lib/services/cachedDataService.ts`
- Execution steps:
  1. Document current export pattern and explicit boundary ownership.
  2. Add TODO guardrails limiting new call-style proliferation.
- Risk assessment: low.
- Validation strategy: lint/type checks.

### 11) ARCH-011
- Slop title: Cache invalidation rule set includes non-active operations, diluting failure signal clarity
- Category: Indirection without leverage
- Score: 5
- Chosen action type: Delete
- Files/modules affected: `lib/services/cacheInvalidationRules.ts`
- Execution steps:
  1. Remove non-active invalidation rule entries not referenced by runtime mutation calls.
  2. Keep only active operation keys used by `cachedDataService`.
- Risk assessment: low-medium; hidden callers could rely on removed inactive keys.
- Validation strategy: search-based usage validation + cache tests.
