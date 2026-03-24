## Architecture Slop Trends

- Generated at: `2026-03-23T21:18:24+01:00`
- Source: `slops/ARCH_SLOP_PRIORITY.md`
- History file: `slops/ARCH_SLOP_HISTORY.json`
- Snapshot type: `baseline` (no prior history found)

### Lifecycle Classification (This Run)

| status | count |
|---|---:|
| new | 11 |
| persistent | 0 |
| escalated | 0 |
| de-escalated | 0 |
| resolved | 0 |

### Severity Distribution (Current)

| severity | count |
|---|---:|
| 10 | 1 |
| 9 | 2 |
| 8 | 3 |
| 7 | 1 |
| 6 | 2 |
| 5 | 1 |
| 4 | 1 |

### High-Risk Focus (Severity >= 8)

- `ARCH-001` (10) - Missing explicit error taxonomy across auth/session/data/privacy boundaries
- `ARCH-002` (9) - Silent-failure risk from multi-layer fallback chains (crypto + cache + offline)
- `ARCH-003` (9) - Inconsistent error propagation between client provider, service facades, and API routes
- `ARCH-004` (8) - Import/export pipeline likely lacks partial-failure semantics
- `ARCH-005` (8) - Unused dual-service architecture (`simple` vs `cached`) increases error drift
- `ARCH-006` (8) - Auth refresh/validation loop lacks explicit retry budget and terminal states

### Notes

- Since this is the first recorded snapshot, all tracked slops are marked `new`.
- Next run should compare by `id` and severity delta to classify `persistent`, `escalated`, `de-escalated`, and `resolved`.
