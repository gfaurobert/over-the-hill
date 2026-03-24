## Architecture Drift & Duplication Report

Source: `slops/ARCHITECTURE.md`  
Focus: copy-paste logic, divergence, and canonical source recommendations.

### Executive take

- The architecture document is structurally rich but repeats the same subsystem inventory across multiple sections.
- The highest-risk drift is the dual data-facade narrative (`simple` vs `cached`) versus observed primary runtime usage.
- Schema and encryption sections are directionally correct, but implementation-level details are moving fast and should be anchored to code/migrations.

### Findings

| id | kind | severity | finding | evidence | suggested canonical source |
|---|---|---|---|---|---|
| DRIFT-001 | copy-paste | medium | Service ownership and data flow inventory repeated across Module Map, Core Flows, and Ownership Zones. | `slops/ARCHITECTURE.md` sections: Module Map, Core Flows, Ownership Zones | Runtime import graph: `components/HillChartApp.tsx`, `lib/services/simpleDataService.ts`, `lib/services/supabaseService.ts` |
| DRIFT-002 | drift | high | Docs present `simple` and `cached` facades as peers, while active UI entrypoint uses `simpleDataService` as primary path. | `components/HillChartApp.tsx` import usage + facade listings in `slops/ARCHITECTURE.md` | Single runtime facade decision in `components/HillChartApp.tsx`; classify `cached` as primary/secondary explicitly |
| DRIFT-003 | copy-paste | medium | Auth/session pipeline repeated in auth module map, session flow, ownership, and hotspots. | `slops/ARCHITECTURE.md` repeated listing of `AuthProvider`, `sessionValidationService`, validate/refresh routes, `proxy.ts` | Auth state machine contract: `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `app/api/auth/*`, `proxy.ts` |
| DRIFT-004 | copy-paste | medium | Cache stack (cache service + invalidation rules + service worker) repeated in 4 sections with slight term variation. | `slops/ARCHITECTURE.md` cache sections + hotspots | Cache semantics table from: `lib/services/cacheInvalidationRules.ts`, `lib/services/cacheService.ts`, `public/sw.js` |
| DRIFT-005 | drift | medium | Preference schema is evolving quickly; static prose can lag migration truth. | migrations: `20260323120000_*`, `20260323133000_*`, `20260323203000_*`; mapping in `lib/services/supabaseService.ts` | `supabase/migrations/*.sql` as source of truth; keep architecture text high-level |
| DRIFT-006 | drift | medium | Encryption flow references RPC + fallback behavior that can drift with SQL function revisions. | `lib/services/privacyService.ts` + encryption-related SQL migrations | Security contract in `privacyService` + SQL migration comments (policy-level text in architecture doc only) |
| DRIFT-007 | copy-paste | low | Hotspots largely restate ownership inventory without measurable risk metadata. | Ownership Zones + Hotspots in `slops/ARCHITECTURE.md` | Hotspots should come from measurable metrics (change frequency, coupling, defect rate) |

### Canonical source map (recommended)

| domain | canonical source(s) |
|---|---|
| Runtime data flow | `components/HillChartApp.tsx`, `lib/services/simpleDataService.ts`, `lib/services/supabaseService.ts` |
| Auth/session | `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `app/api/auth/validate/route.ts`, `app/api/auth/refresh/route.ts`, `proxy.ts` |
| Database schema | `supabase/migrations/*.sql` |
| Cache semantics | `lib/services/cacheInvalidationRules.ts`, `lib/services/cacheService.ts`, `public/sw.js` |
| Privacy/crypto | `lib/services/privacyService.ts`, `supabase/migrations/*encryption*.sql` |

### Practical cleanup steps

1. Collapse repeated architecture sections into one canonical section per subsystem (data, auth, cache, crypto).
2. Add short "references only" sections elsewhere instead of repeating behavior prose.
3. Resolve facade ambiguity: declare one production facade and demote/remove the alternate path.
4. Keep implementation-sensitive details (schema fields, crypto function specifics) out of prose and tie them to migrations/code comments.
5. Rework Hotspots to include objective metrics so they are not just a duplicated inventory.
