# Collection Severity Sidebar Design

## Summary

Re-order the sidebar's collection list so work that needs attention surfaces first, and add a small floating status dot on each collection button. A collection's rank is driven by the worst (most urgent) dot it contains, measured by status slot rather than literal color. The indicator is a single floating dot (red / amber / emerald) at the top-right of the collection button, shown only when a collection has at least one Blocked, At Risk, or On Track dot. The feature is always on, requires no user setting, and changes no persisted state.

## Goals

- Make ongoing work visually dominant in the sidebar: Blocked > At Risk > On Track > Discovery > Done > Empty.
- Give users an at-a-glance status indicator per collection without opening it.
- Keep the change local to the sidebar list; preserve every other flow (search, pagination, edit, archive, delete, Today pinning, release lines, snapshots, exports).
- Zero new settings, zero new persistence.

## Non-Goals

- No user-facing toggle. If chronological order is needed later, it can be added as a preference then.
- No animations for re-ordering in v1.
- No tooltip or popover on the floating dot.
- No multi-lamp stoplight. Exactly one floating dot per collection (or none).
- No filtering or grouping UI. Order is the only expression of severity.
- No changes to the Today collection's pinning or contents; only its rendering gets the same floating-dot treatment.
- No changes to archived collection lists (the collapsible archived section is out of scope).
- No backend schema changes. `created_at` already exists on `collections`; we just start selecting it.

## Severity Model

Every collection has a computed severity rank derived from its **active (non-archived) dots**. The rank uses the semantic palette slot from `DotColorPreferences`, not the literal color hex, so custom palettes still sort correctly.

| Rank | Slot          | Default color    | Label     |
| ---- | ------------- | ---------------- | --------- |
| 1    | `dangerZone`  | red              | Blocked   |
| 2    | `downslope`   | yellow / orange  | At Risk   |
| 3    | `upslope`     | green            | On Track  |
| 4    | `discovery`   | blue             | Discovery |
| 5    | `done`        | purple           | Done      |
| 6    | — (no dots)   | —                | Empty     |

A collection's severity rank = `min(rank_of_slot(dot) for dot in active_dots)`, where "min" means "most urgent". Collections with no active dots get rank 6.

Dots whose color does not match any of the five palette slots (edge case, e.g. legacy data) are ignored for severity computation.

Helper signature (discriminated union so rank 1–3 always carries a color and label, rank 4–6 never does):

```ts
type CollectionSeverity =
  | { rank: 1; indicatorColor: "red"; statusLabel: "Blocked" }
  | { rank: 2; indicatorColor: "amber"; statusLabel: "At Risk" }
  | { rank: 3; indicatorColor: "emerald"; statusLabel: "On Track" }
  | { rank: 4; indicatorColor: null; statusLabel: null }
  | { rank: 5; indicatorColor: null; statusLabel: null }
  | { rank: 6; indicatorColor: null; statusLabel: null };

function getCollectionSeverity(
  collection: Collection,
  dotColors: DotColorPreferences,
): CollectionSeverity;
```

## Sidebar Ordering

The sidebar currently renders `collectionsForSelector = [todayDisplayCollection?, ...nonTodayCollections]` in `components/HillChartApp.tsx`. The change is confined to `nonTodayCollections`:

1. **Today stays pinned first.** No change to its conditional inclusion.
2. **Primary sort on the rest: severity rank ascending** (1 first, 6 last).
3. **Tie-breaker: `created_at` descending** (newest first). Requires surfacing `created_at` from Supabase (see Data Access).
4. **Fallback when `created_at` is missing**: keep the current implicit order from the fetch (stable sort preserves relative positions).
5. **Search is applied after sort** so severity order is preserved inside query results.
6. **Pagination is applied after sort and filter**, so page 1 always shows the most urgent work.

No persistence, no derived state stored in React — this is a pure derivation that re-computes on each render. The input (`collections`) is already cached by the data layer; dot counts are small; no memoization is required unless profiling shows otherwise.

## Visual Indicator

Single floating dot at the top-right corner of each collection button, overlapping the border slightly.

**When shown.** Only for severity ranks 1, 2, and 3. Ranks 4 (Discovery-only), 5 (Done-only), and 6 (Empty) render no dot.

**Color mapping.** Fixed, independent of the user's palette, so the "traffic light" metaphor always reads clearly:

| Rank | Tailwind light mode | Tailwind dark mode |
| ---- | ------------------- | ------------------ |
| 1    | `bg-red-500`        | `bg-red-400`       |
| 2    | `bg-amber-400`      | `bg-amber-300`     |
| 3    | `bg-emerald-500`    | `bg-emerald-400`   |

**Geometry.** `h-2.5 w-2.5` (10px), absolutely positioned at `-top-1 -right-1` on the existing `className="relative"` wrapper around each collection button. `ring-2 ring-background` separates the dot from the button edge in both themes. `pointer-events-none` keeps the whole button clickable as one unit.

**Stacking with the action menu.** The existing `...` button is at `right-1 top-1/2 -translate-y-1/2`. The floating dot at `-top-1 -right-1` sits above and slightly outside it, so there is no visual collision. The dot is decorative and does not need a higher z-index than the action menu.

**Accessibility.** The `<span>` itself is `aria-hidden="true"`. Status is communicated to assistive tech by appending it to the collection button's accessible name, e.g. `aria-label="Q2 Launch, Blocked"`. Ranks 4–6 get the plain collection name with no suffix.

**Today collection.** Gets the same treatment. Its merged dot set (`mergedTodayDots`) feeds `getCollectionSeverity` and the floating dot renders on the Today row when applicable. Today has no `...` menu, so layout is simpler.

## Data Access

The `collections` table in Supabase already has a `created_at TIMESTAMP` column (see `supabase/migrations/20250710091059_create_hill_chart_schema.sql`). It is not currently selected by `fetchCollections` in `lib/services/supabaseService.ts`.

Change:

- Add `created_at` to the SELECT in `fetchCollections`.
- Pass it through the decryption mapping to the returned `Collection` objects.
- Add an optional `created_at?: string` field to the `Collection` interface in `components/HillChartApp.tsx`.

No migration. No RLS change. Client-side only once the field is selected.

## Code Touch Points

All UI changes are in `components/HillChartApp.tsx`. All backend changes are in `lib/services/supabaseService.ts`.

1. **`lib/services/supabaseService.ts`**: add `created_at` to the collections SELECT and to the mapped `Collection` returned by `fetchCollections`.
2. **`components/HillChartApp.tsx`**: extend the local `Collection` interface with `created_at?: string`.
3. **`components/HillChartApp.tsx`**: add a pure helper `getCollectionSeverity(collection, dotColors): CollectionSeverity` near the other top-level helpers. Discriminated-union return type so rank 1–3 carries a color and label, rank 4–6 carries `null`s.
4. **`components/HillChartApp.tsx`**: replace the derivation of `nonTodayCollections` with a sorted version — map to `{ collection, severity }`, `sort` by `(severity.rank asc, created_at desc)`, strip the wrapper. The shape of `collectionsForSelector` is unchanged, so downstream pagination and search code is untouched.
5. **`components/HillChartApp.tsx`**: in the collection button render loop, call `getCollectionSeverity` once per row. Render a conditional `<span>` with the floating-dot classes when `severity.indicatorColor` is non-null. Append status to the button's `aria-label`.
6. **`components/HillChartApp.tsx`**: the Today-collection render path does the same `getCollectionSeverity` + conditional `<span>`.

Pagination wheel logic, search input, collection action menu, edit flow, archive flow, delete flow, snapshot flow, release-line flow, and export flow stay untouched.

## Edge Cases

- **Archived dots** are excluded from severity computation (filter `dot.archived` out before ranking).
- **Custom palettes**: severity follows the semantic slot via `dotColors`, so swapping "Blocked" to orange still ranks the collection as rank 1.
- **Unknown dot colors** (legacy rows, palette no longer matching): excluded from severity computation. A collection whose dots are all unknown falls to rank 6 (treated as empty).
- **Empty collections** sort to the bottom. Ordering among empty collections falls back to `created_at` desc.
- **Today collection without active-status dots**: still pinned first, no floating dot. Consistent with other collections of the same rank.
- **Re-ordering during interactions**: changing a dot's color, archiving a dot, or adding a dot triggers a React re-render and the sidebar re-sorts in place. No animation.
- **Search**: filter is applied after sort, so results preserve severity ordering.
- **`created_at` missing** (older imported rows): stable sort keeps relative order from the fetch, so nothing disappears or jumps.

## Testing

**Unit tests** for `getCollectionSeverity` (new file alongside other pure helpers):

- Empty collection → rank 6, no indicator.
- Only discovery dots → rank 4, no indicator.
- Only done dots → rank 5, no indicator.
- Discovery + done mix → rank 4, no indicator.
- On-track only → rank 3, emerald, "On Track".
- On-track + done → rank 3, emerald.
- At-risk + on-track → rank 2, amber, "At Risk".
- Blocked + at-risk + on-track → rank 1, red, "Blocked".
- Blocked dot archived + on-track active → rank 3 (archived ignored).
- Custom palette with swapped colors → still maps via `dotColors` slots, not literal color strings.
- Unknown dot color → ignored; all-unknown collection → rank 6.

**Integration tests** in `components/HillChartApp.collection-mutations.test.tsx` (or a sibling file):

- Given a fixture covering one collection per severity bucket, assert rendered order: Today (if present) → rank 1 → 6. Break ties with `created_at` desc.
- Assert the floating dot is present on rank-1-to-3 rows with the correct color class, and absent on rank-4-to-6 rows.
- Mutate a dot from Blocked to On Track; assert the row re-sorts and the dot color changes.
- Archive the only Blocked dot in a collection; assert its rank drops and the indicator updates.
- With `showTodayCollection = false`, assert Today is absent and ordering is unaffected.
- Assert the button's `aria-label` contains the status suffix for rank-1-to-3 rows and omits it for rank-4-to-6 rows.

**Manual QA checklist:**

1. Light and dark mode — dot colors are legible against both button states (default, hover, selected).
2. Screen reader (VoiceOver or NVDA) announces the status suffix.
3. Search preserves severity order inside filtered results.
4. Pagination wheel still advances pages; page 1 shows the most urgent work.
5. Today collection behaves correctly with and without active-status dots.
6. No regression on the action menu `...` button, editing, archiving, or deleting a collection.

## Open Questions

None. All decisions are captured above.
