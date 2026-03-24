# ARCH SL0P ACTIONABLE ARBITRATION

Generated at: `2026-03-23T21:18:24+01:00`

## Arbitration Outcome

- Defender context is accepted as operational background, but prosecutor objections are upheld for AI-assisted coding risk.
- Trends classify all items as `new` baseline; none are resolved or de-escalated yet.
- Action bias: harden boundary contracts and degraded-mode signaling before feature expansion.

## Sources

- `slops/ARCH_SL0P_DEFENSE.json`
- `slops/ARCH_SL0P_PROSECUTOR.json`
- `slops/ARCH_SLOP_PRIORITY.md`
- `slops/ARCH_SLOP_TRENDS.md`
- `slops/ARCH_SL0P.md`

## Actionable Slop Table

| id | title | category | score | trend | failure risk | references |
|---|---|---|---:|---|---|---|
| ARCH-001 | Missing explicit error taxonomy across auth/session/data/privacy boundaries | Missing domain errors | 10 | new | critical | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-002 | Silent-failure risk from multi-layer fallback chains (crypto + cache + offline) | Silent failures | 9 | new | critical | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-003 | Inconsistent error propagation between client provider, service facades, and API routes | Mismanaged propagation | 9 | new | high | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-006 | Auth refresh/validation loop lacks explicit retry budget and terminal states | Mismanaged control flow | 8 | new | critical | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-004 | Import/export pipeline likely lacks partial-failure semantics | Missing domain errors | 8 | new | high | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-005 | Unused dual-service architecture (`simple` vs `cached`) increases error drift | Premature abstraction | 8 | new | high | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-007 | Cache subsystem breadth can mask cache-write/cache-invalidate failures | Silent failures | 7 | new | high | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-010 | Placeholder options/no-op API paths can imply successful handling when none occurred | Silent failures | 7 | new | high | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-008 | SSR mock cache adapters risk diverging failure semantics from browser runtime | Mismanaged propagation | 6 | new | medium-high | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-009 | "Class + singleton + bound exports" obscures ownership of throw/catch boundaries | Indirection without leverage | 6 | new | medium-high | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |
| ARCH-011 | Cache invalidation rule set includes non-active operations, diluting failure signal clarity | Indirection without leverage | 5 | new | medium | `slops/ARCH_SLOP_PRIORITY.md`, `slops/ARCH_SL0P_DEFENSE.json`, `slops/ARCH_SL0P_PROSECUTOR.json` |

## AI Coding Prioritization Guidance

### Tier 1 (Immediate guardrails)

1. `ARCH-001`: introduce a shared domain error taxonomy and require boundary mappers.
2. `ARCH-002`: make fallback/degraded modes explicit and user-visible.
3. `ARCH-003`: standardize one error propagation contract per boundary family.
4. `ARCH-006`: define auth retry budget + terminal states to prevent loop/race regressions.

### Tier 2 (Stability and recoverability)

5. `ARCH-004`: add partial-success import report and idempotent resumability.
6. `ARCH-005`: converge on one runtime service facade or enforce parity tests.
7. `ARCH-007`: elevate cache outcomes to first-class observability signals.
8. `ARCH-010`: remove or loudly signal no-op placeholders.

### Tier 3 (Complexity and parity cleanup)

9. `ARCH-008`: align SSR adapter failure semantics with browser runtime.
10. `ARCH-009`: collapse service invocation style to clarify throw/catch ownership.
11. `ARCH-011`: prune speculative invalidation rules to active, test-backed operations.

## Suggested AI PR Gate Checklist

- Every changed boundary maps errors to a stable domain code (no raw generic throw-through).
- Fallback paths return explicit `degraded` or `failed` outcomes, not silent success.
- Auth/session changes include retry budget assertions and terminal state coverage.
- Import/batch operations report partial outcomes (`created/updated/skipped/failed`).
- Cache-affecting changes include invalidation and telemetry assertions.
