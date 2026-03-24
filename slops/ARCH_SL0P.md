# ARCH SL0P DOSSIER (Canonical)

This file is the consolidated, canonical slop input for downstream defender/prosecutor/arbitration agents.
It merges key findings from:

- `slops/ARCH_SLOP_PRIORITY.md`
- `slops/ARCH_SLOP_ADVISORY.md`
- `slops/ARCH_SLOP_DRIFT.md`
- `slops/ARCH_SLOP_PERFORMANCE.md`
- `slops/ARCH_SLOP_INTENT.md`

## Canonical Fields

- **id**
- **title**
- **category**
- **severity_or_score**
- **trend** (when available)
- **evidence_paths**

## Consolidated Findings

| id | title | category | severity_or_score | trend | evidence_paths |
|---|---|---|---|---|---|
| ARCH-001 | Missing explicit error taxonomy across auth/session/data/privacy boundaries | Missing domain errors | 10/10 | Not specified | `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `app/api/auth/validate/route.ts`, `app/api/auth/refresh/route.ts`, `lib/services/supabaseService.ts`, `lib/services/privacyService.ts` |
| ARCH-002 | Silent-failure risk from multi-layer fallback chains (crypto + cache + offline) | Silent failures | 9/10 | Not specified | `lib/services/privacyService.ts`, `lib/services/cacheService.ts`, `public/sw.js`, `lib/services/simpleDataService.ts`, `lib/services/supabaseService.ts` |
| ARCH-003 | Inconsistent error propagation between client provider, service facades, and API routes | Mismanaged propagation | 9/10 | Not specified | `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `lib/services/simpleDataService.ts`, `lib/services/cachedDataService.ts`, `app/api/auth/validate/route.ts`, `app/api/auth/refresh/route.ts` |
| ARCH-004 | Import/export pipeline likely lacks partial-failure semantics | Missing domain errors | 8/10 | Not specified | `components/HillChartApp.tsx`, `components/PrivacySettings.tsx`, `lib/services/supabaseService.ts#importData` |
| ARCH-005 | Unused dual-service architecture (`simple` vs `cached`) increases error drift | Premature abstraction | 8/10 | Not specified | `lib/services/simpleDataService.ts`, `lib/services/cachedDataService.ts`, `components/HillChartApp.tsx`, `components/PrivacySettings.tsx`, `components/ImportDataPrompt.tsx` |
| ARCH-006 | Auth refresh/validation loop lacks explicit retry budget and terminal states | Mismanaged control flow | 8/10 | Not specified | `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `app/api/auth/validate/route.ts`, `app/api/auth/refresh/route.ts` |
| ARCH-007 | Cache subsystem breadth can mask cache-write/cache-invalidate failures | Silent failures | 7/10 | Not specified | `lib/services/cacheService.ts`, `lib/services/cacheInvalidationRules.ts`, `lib/services/cachedDataService.ts`, `public/sw.js` |
| ARCH-008 | SSR mock cache adapters risk diverging failure semantics from browser runtime | Mismanaged propagation | 6/10 | Not specified | `lib/services/cacheService.ts`, `lib/services/cachedDataService.ts` |
| ARCH-009 | "Class + singleton + bound exports" obscures ownership of throw/catch boundaries | Indirection without leverage | 6/10 | Not specified | `lib/services/simpleDataService.ts`, `lib/services/cachedDataService.ts` |
| ARCH-010 | Placeholder options/no-op API paths can imply successful handling when none occurred | Silent failures | 5/10 | Not specified | `lib/services/simpleDataService.ts` |
| ARCH-011 | Cache invalidation rule set includes non-active operations, diluting failure signal clarity | Indirection without leverage | 4/10 | Not specified | `lib/services/cacheInvalidationRules.ts`, `lib/services/cachedDataService.ts`, `lib/services/cacheService.ts` |
| PERF-001 | Per-dot mutation flow creates N+1 network writes in batch actions | N+1 (client -> DB writes) | 9/10 | Not specified | `components/HillChartApp.tsx#updateDot`, `components/HillChartApp.tsx#archiveSelectedDots`, `components/HillChartApp.tsx#markSelectedDotsAsDone`, `components/HillChartApp.tsx#flagSelectedDotsForToday`, `lib/services/simpleDataService.ts#updateDot`, `lib/services/supabaseService.ts#updateDot` |
| PERF-002 | Collection hydration does O(collections * dots) in-memory joins | Hidden quadratic behavior | 8/10 | Not specified | `lib/services/supabaseService.ts#fetchCollections` |
| PERF-003 | Label collision resolver is quadratic with extra retry multiplier | Hidden quadratic hot loop | 8/10 | Not specified | `components/HillChartApp.tsx#resolveCollisions` |
| PERF-004 | Batch delete ownership lookup repeats full collection scan per dot | N+1 lookup / repeated full scans | 7/10 | Not specified | `components/HillChartApp.tsx#getOwningCollectionId`, `components/HillChartApp.tsx#confirmBatchDelete` |
| PERF-005 | Calendar rendering performs repeated snapshot membership scans | Hot-path waste | 6/10 | Not specified | `components/HillChartApp.tsx#renderCalendar` |
| PERF-006 | Selected-dot filtering uses array includes in nested loops | Hot-path waste / accidental quadratic | 5/10 | Not specified | `components/HillChartApp.tsx#archiveSelectedDots`, `components/HillChartApp.tsx#markSelectedDotsAsDone`, `components/HillChartApp.tsx#flagSelectedDotsForToday` |
| DRIFT-001 | Service ownership and data flow inventory repeated across multiple architecture sections | Copy-paste | Medium | Not specified | `slops/ARCHITECTURE.md` (Module Map, Core Flows, Ownership Zones), `components/HillChartApp.tsx`, `lib/services/simpleDataService.ts`, `lib/services/supabaseService.ts` |
| DRIFT-002 | Docs present `simple` and `cached` facades as peers while runtime entrypoint appears `simple`-first | Drift | High | Not specified | `components/HillChartApp.tsx`, `slops/ARCHITECTURE.md` |
| DRIFT-003 | Auth/session pipeline repeated in multiple architecture sections | Copy-paste | Medium | Not specified | `slops/ARCHITECTURE.md`, `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `app/api/auth/*`, `proxy.ts` |
| DRIFT-004 | Cache stack repeated across sections with slight terminology drift | Copy-paste | Medium | Not specified | `slops/ARCHITECTURE.md`, `lib/services/cacheInvalidationRules.ts`, `lib/services/cacheService.ts`, `public/sw.js` |
| DRIFT-005 | Preference schema prose can lag migration truth as schema evolves quickly | Drift | Medium | Not specified | `supabase/migrations/20260323120000_*`, `supabase/migrations/20260323133000_*`, `supabase/migrations/20260323203000_*`, `lib/services/supabaseService.ts` |
| DRIFT-006 | Encryption flow docs can drift from actual RPC and SQL-function revisions | Drift | Medium | Not specified | `lib/services/privacyService.ts`, `supabase/migrations/*encryption*.sql` |
| DRIFT-007 | Hotspots section largely restates inventory without measurable risk metadata | Copy-paste | Low | Not specified | `slops/ARCHITECTURE.md` |
| INT-001 | Name `simpleDataService` under-describes real orchestration and risk surface | Misleading name | Not numerically scored | Not specified | `lib/services/simpleDataService.ts`, `slops/ARCHITECTURE.md`, `slops/ARCH_SLOP_PRIORITY.md` |
| INT-002 | Name `cachedDataService` implies additive cache while behavior can drift as a parallel facade | Misleading name | Not numerically scored | Not specified | `lib/services/cachedDataService.ts`, `slops/ARCH_SLOP_PRIORITY.md` |
| INT-003 | "Privacy/Crypto Zone" wording implies isolated ownership despite distributed responsibility | Misleading naming/ownership framing | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |
| INT-004 | "Cache coherence flow" wording implies stronger guarantees than documented behavior | Misleading naming/consistency framing | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |
| INT-005 | Generic `proxy.ts` naming obscures edge auth gate ownership intent in docs | Misleading naming/ownership framing | Not numerically scored | Not specified | `slops/ARCHITECTURE.md`, `proxy.ts` |
| INT-006 | "Hotspots" label does not separate intentional complexity from unowned failure boundaries | Misleading label | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |
| INT-101 | Boundary error contract is undefined across auth routes, providers, and facades | Unexplained logic | Not numerically scored | Not specified | `components/AuthProvider.tsx`, `app/api/auth/validate/route.ts`, `app/api/auth/refresh/route.ts`, `lib/services/simpleDataService.ts`, `lib/services/privacyService.ts` |
| INT-102 | Fallback behavior lacks an explicit degraded-mode policy | Unexplained logic | Not numerically scored | Not specified | `lib/services/privacyService.ts`, `lib/services/cacheService.ts`, `public/sw.js`, `slops/ARCHITECTURE.md` |
| INT-103 | Auth validate/refresh lifecycle lacks explicit state-machine intent | Unexplained logic | Not numerically scored | Not specified | `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `app/api/auth/validate/route.ts`, `app/api/auth/refresh/route.ts` |
| INT-104 | Import pipeline intent for partial failure/resumability is not explicit | Unexplained logic | Not numerically scored | Not specified | `lib/services/supabaseService.ts#importData`, `components/HillChartApp.tsx`, `components/PrivacySettings.tsx` |
| INT-105 | Ownership zones do not define final decision rights for cross-zone conflicts | Unexplained logic | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |
| INT-106 | Service worker role is under-specified in the domain-data correctness model | Unexplained logic | Not numerically scored | Not specified | `public/sw.js`, `slops/ARCHITECTURE.md` |
| INT-201 | "Main responsibility" zone prose is descriptive but non-operational | Dead phrasing / unenforceable ownership | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |
| INT-202 | "Cache coherence flow" phrasing implies guarantees without explicit consistency contract | Dead phrasing / implied guarantee | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |
| INT-203 | "Optional cache path" phrasing lacks activation/decision criteria | Dead phrasing / non-actionable intent | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |
| INT-204 | Priority doc action items have no owner/target milestone metadata | Dead phrasing / execution ambiguity | Not numerically scored | Not specified | `slops/ARCH_SLOP_PRIORITY.md` |
| INT-205 | Hotspots are listed without accountable owner handoff | Dead phrasing / ownership gap | Not numerically scored | Not specified | `slops/ARCHITECTURE.md` |

## Source-Level Notes

- **Priority findings (`ARCH-*`)**: numeric severity retained as reported.
- **Performance findings (`PERF-*`)**: numeric severity retained as reported.
- **Drift findings (`DRIFT-*`)**: qualitative severity retained as reported (`High`/`Medium`/`Low`).
- **Intent findings (`INT-*`)**: source audit provides IDs and finding classes; no numeric score in source, so `severity_or_score` is marked `Not numerically scored`.
- **Trend**: no per-finding trend metadata appears in the five source files; trend is marked `Not specified`.

## Arbitration-Ready Interpretation Rules

Use the following normalization rules when comparing findings across agents:

1. Treat `severity_or_score` as source-native (numeric or qualitative), do not coerce unless a decision rubric explicitly requires it.
2. Give precedence to findings with both:
   - a stable ID (`ARCH-*`, `PERF-*`, `DRIFT-*`, `INT-*`), and
   - at least one concrete code/schema evidence path.
3. When findings overlap conceptually (for example `ARCH-005`, `DRIFT-002`, `INT-001`, `INT-002`), preserve all IDs and aggregate during scoring rather than deduplicating by title.
4. If downstream scoring needs trend, require separate enrichment from `slops/ARCH_SLOP_TRENDS.md` or git-history metrics before assigning directional movement.
