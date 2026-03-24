## Intent and Ownership Slop Audit

### Scope

- Inputs reviewed: `slops/ARCHITECTURE.md`, `slops/ARCH_SLOP_PRIORITY.md`.
- Goal: identify misleading names, unexplained logic, and dead comments/phrasing that hide ownership and intent.

## Misleading Names

| id | name or phrase | where | why it misleads | recommendation |
|---|---|---|---|---|
| INT-001 | "simpleDataService" | `lib/services/simpleDataService.ts` (referenced by both docs) | "Simple" implies low logic/low risk, but architecture describes it as the default facade over validation, encryption, persistence, and failure translation. | Rename to `dataService` (if canonical facade) or `directDataService` (if bypasses cache). |
| INT-002 | "cachedDataService" | `lib/services/cachedDataService.ts` | Name implies additive caching only, but priority doc flags potential semantic drift in error behavior; this is effectively a second facade with separate failure semantics. | Rename to `dataServiceWithCache` only if retained, otherwise deprecate and converge. |
| INT-003 | "Privacy/Crypto Zone" ownership wording | `slops/ARCHITECTURE.md` ownership section | Zone label suggests isolated responsibility, while key generation, API routes, DB RPCs, and client fallback spread ownership across multiple boundaries. | Split naming into `Crypto Primitives` vs `Key Lifecycle & Access Control` ownership. |
| INT-004 | "Cache coherence flow" | `slops/ARCHITECTURE.md` core flows | "Coherence" implies guaranteed consistency, but architecture and priority notes describe multiple cache layers and fallback behavior where stale outcomes are possible. | Rename flow section to `Cache behavior and invalidation flow` and explicitly note non-strong consistency. |
| INT-005 | "proxy.ts" in auth/security ownership | `slops/ARCHITECTURE.md` | "Proxy" is generic and under-describes role as route gate/rate-limit/auth boundary, which obscures who owns failures and redirects. | Document as `edge auth gate` in architecture language, even if filename remains unchanged. |
| INT-006 | "Hotspots" | `slops/ARCHITECTURE.md` | Label indicates code concentration, but does not distinguish "complex but intentional" from "unowned failure boundary." | Rename subsection to `Complexity and ownership-risk hotspots`. |

## Unexplained Logic (Intent Not Made Explicit)

| id | logic gap | where | missing intent statement | recommendation |
|---|---|---|---|---|
| INT-101 | Boundary error contract is undefined | Cross-cutting: auth routes, providers, facades, privacy service | Docs do not state whether errors are thrown, returned, or normalized by layer. | Add one architecture rule: `Result<T, DomainError>` at boundaries (or throw+mapper), and list owner per boundary mapper. |
| INT-102 | Fallback behavior has no declared degraded-mode policy | Crypto + cache + SW paths | Fallbacks are described, but not whether fallback is equivalent, degraded, or blocked by policy. | Add a degraded-mode matrix (`mode`, `user impact`, `UI surfacing`, `telemetry`, `owner`). |
| INT-103 | Auth validate/refresh lifecycle lacks explicit state machine | Auth provider + validation/refresh routes | No terminal states or retry budget are documented, so intent for loop termination is unclear. | Document states/transitions (`valid`, `refreshing`, `reauth_required`, `logged_out`) and owning module. |
| INT-104 | Import pipeline intent for partial failure is missing | `supabaseService#importData` flow in docs | Architecture says batched upsert/encryption but not whether partial success is acceptable or resumable. | Define import result contract (`created`, `updated`, `skipped`, `failed`, `retryable`). |
| INT-105 | Ownership boundaries are listed by zone but not by decision rights | Ownership zones in architecture doc | "Footprint" and "responsibility" are broad; unclear who decides conflict resolution for cross-zone behavior (e.g., auth vs privacy fallback). | Add explicit "final decision owner" per cross-boundary concern. |
| INT-106 | Service worker role is under-specified in data correctness story | Cache/offline section | SW exclusions are noted, but expectations for stale asset/data interactions and failure surfacing are not. | Add contract for SW: "assets only, never source of truth for domain data," plus failure-report path. |

## Dead Comments / Dead Phrasing

These are documentation statements that read as complete design intent but currently act as placeholders without enforceable semantics.

| id | dead or weak phrase | where | why effectively dead | recommendation |
|---|---|---|---|---|
| INT-201 | "Main responsibility" lists (zone sections) | `slops/ARCHITECTURE.md` ownership zones | Responsibilities are descriptive but non-operational; no interface contracts, SLOs, or escalation ownership. | Replace with measurable ownership clauses (inputs/outputs, failure owner, pager/escalation path). |
| INT-202 | "Cache coherence flow" wording | `slops/ARCHITECTURE.md` | Implies guarantee without defining coherence level or invalidation SLA. | Replace with explicit consistency claim and known non-guarantees. |
| INT-203 | "Optional cache path" | `slops/ARCHITECTURE.md` | Optionality is stated, but decision criteria for when cache is active are absent, making phrase non-actionable. | Add activation policy and fallback intent table. |
| INT-204 | "Action:" recommendations in priority doc without owner | `slops/ARCH_SLOP_PRIORITY.md` | Good actions exist but no owner role or target milestone, so they can stagnate as advisory text. | Add `owner`, `target version`, and `definition of done` columns. |
| INT-205 | "Hotspots" list without ownership handoff | `slops/ARCHITECTURE.md` | Hotspots identify complexity but do not map to accountable owner(s) for simplification. | Attach each hotspot to zone owner and expected control surface. |

## Ownership Clarifications to Add Immediately

- **Boundary owner map:** for each boundary (`UI -> facade`, `facade -> supabaseService`, `client -> auth API`, `service -> crypto RPC/client fallback`), name exactly one owner for error translation.
- **Fallback owner map:** assign a single owner per degraded mode (`crypto fallback`, `cache unavailable`, `session refresh exhausted`, `import partial failure`).
- **Contract-first docs:** convert narrative flow bullets into contract blocks with explicit inputs, outputs, and failure outcomes.

## Minimal Rewrite Template (for future architecture docs)

Use this template per flow to prevent intent drift:

1. **Purpose:** one-line business intent.
2. **Owner:** directly responsible team/module.
3. **Contract:** input type, output type, and error/degraded outcomes.
4. **State transitions:** only for multi-step loops (auth/import/retry).
5. **Non-goals:** what the flow does not guarantee.

## Bottom Line

The strongest slop pattern is not missing components; it is missing intent contracts at cross-boundary failure points. Names and phrasing currently imply certainty and ownership that the docs do not actually define. Converting those implied guarantees into explicit contracts and owner maps will remove most ambiguity quickly.
