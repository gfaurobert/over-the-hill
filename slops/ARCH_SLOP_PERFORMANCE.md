## Performance & Scale Slop Priorities

| id | title | category | severity (1-10) | confidence | evidence paths | rationale |
|---|---|---|---:|---|---|---|
| PERF-001 | Per-dot mutation flow creates N+1 network writes in batch actions | N+1 (client -> DB writes) | 9 | High | `components/HillChartApp.tsx#updateDot`, `components/HillChartApp.tsx#archiveSelectedDots`, `components/HillChartApp.tsx#markSelectedDotsAsDone`, `components/HillChartApp.tsx#flagSelectedDotsForToday`, `lib/services/simpleDataService.ts#updateDot`, `lib/services/supabaseService.ts#updateDot` | Bulk actions map selected dot IDs to `updateDot(...)`, and each call issues a separate Supabase `update` for one row. For large selections, latency and failure probability scale linearly with dot count (N requests + N encryption operations + N optimistic state rewrites). **Action:** add batch mutation endpoints (e.g., update many dots by ID) and collapse per-dot writes into one request per action. |
| PERF-002 | Collection hydration does O(collections * dots) in-memory joins | Hidden quadratic behavior | 8 | High | `lib/services/supabaseService.ts#fetchCollections` | `fetchCollections` loads all dots, then for each collection runs `dotsData.filter(dot => dot.collection_id === collection.id)`. That repeatedly scans the full dots array and grows to quadratic-like cost as data scales. **Action:** pre-index dots once with `Map<collectionId, DotRow[]>` or fetch nested relation from SQL/RPC. |
| PERF-003 | Label collision resolver is quadratic with extra retry multiplier | Hidden quadratic hot loop | 8 | Medium-High | `components/HillChartApp.tsx#resolveCollisions` | Collision resolution sorts labels, then for each label scans all previously resolved labels with `Object.values(resolved).some(...)` inside a `while` loop up to `MAX_STACK_ATTEMPTS`. Worst-case complexity trends toward O(n^2 * attempts), and this runs in render path for dense charts. **Action:** use spatial bucketing/sweep-line bins and memoize computed layout by stable dot signature. |
| PERF-004 | Batch delete ownership lookup repeats full collection scan per dot | N+1 lookup / repeated full scans | 7 | High | `components/HillChartApp.tsx#getOwningCollectionId`, `components/HillChartApp.tsx#confirmBatchDelete` | `confirmBatchDelete` calls `getOwningCollectionId` for each dot, and each lookup scans collections and nested dots. This multiplies work during bulk deletes and front-loads expensive client CPU before network calls. **Action:** build a one-pass `Map<dotId, collectionId>` from current collections before batch operations and reuse it. |
| PERF-005 | Calendar rendering performs repeated snapshot membership scans | Hot-path waste | 6 | High | `components/HillChartApp.tsx#renderCalendar` | `renderCalendar` loops all days in month and calls `snapshots.some(...)` per day. This is O(days * snapshots) every render and grows with history. **Action:** precompute `Set<string>` of snapshot dates once per snapshot change and do O(1) membership checks in render. |
| PERF-006 | Selected-dot filtering uses array includes in nested loops | Hot-path waste / accidental quadratic | 5 | High | `components/HillChartApp.tsx#archiveSelectedDots`, `components/HillChartApp.tsx#markSelectedDotsAsDone`, `components/HillChartApp.tsx#flagSelectedDotsForToday` | Patterns like `activeDots.filter(dot => selectedDotIds.includes(dot.id))` run `includes` for each active dot, creating O(activeDots * selectedDotIds) behavior in frequently used bulk actions. **Action:** convert selected IDs to `Set` before filtering and reuse across action steps. |

## Suggested execution order

1. Remove N+1 write amplification in bulk dot actions (`PERF-001`).
2. Eliminate quadratic collection hydration join (`PERF-002`).
3. Optimize chart label collision algorithm for dense boards (`PERF-003`).
4. Replace repeated ownership scans in batch delete with precomputed lookup (`PERF-004`).
5. Trim render-time waste in calendar and selection filters (`PERF-005`, `PERF-006`).

## Quick evidence notes

- `PERF-001`: `archiveSelectedDots`, `markSelectedDotsAsDone`, and `flagSelectedDotsForToday` all call `Promise.allSettled(selectedIds.map(dotId => updateDot(...)))`; `updateDot` ultimately calls Supabase single-row update.
- `PERF-002`: `fetchCollections` executes `collectionsData.map(...)` and inside each iteration performs `dotsData.filter(...)`.
- `PERF-003`: `resolveCollisions` contains `positionsArray.forEach(...)` + `while (...)` + `Object.values(resolved).some(...)`.
- `PERF-004`: `confirmBatchDelete` maps each dotId to `getOwningCollectionId`, which does `collections.find(...dots.some(...))`.
- `PERF-005`: `renderCalendar` computes `hasSnapshot = snapshots.some(...)` for each day.
- `PERF-006`: multiple bulk actions compute selected IDs using `selectedDotIds.includes(...)` inside `activeDots.filter(...)`.
