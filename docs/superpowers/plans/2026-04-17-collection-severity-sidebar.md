# Collection Severity Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-order the sidebar's collection list by worst-dot severity (Blocked > At Risk > On Track > Discovery > Done > Empty) and add a single floating status dot on collections with active work, per `docs/superpowers/specs/2026-04-17-collection-severity-sidebar-design.md`.

**Architecture:** Add a pure helper module `lib/utils/collectionSeverity.ts` that exposes a discriminated-union `CollectionSeverity` type, a `getCollectionSeverity` ranking function, and a `sortCollectionsBySeverity` comparator. Surface `created_at` from the existing Supabase `collections` table so it can tie-break equal severities. Apply the sort in `HillChartApp.tsx` to `nonTodayCollections` and render a conditional floating `<span>` at the top-right of each collection button with an updated `aria-label`. No schema changes, no new settings, no new persistence.

**Tech Stack:** TypeScript, React 19, Next.js 15, Tailwind CSS, Supabase JS client, Jest + `@testing-library/jest-dom` (jsdom). Existing `cn` helper at `@/lib/utils`.

---

## File Structure

**New files:**
- `lib/utils/collectionSeverity.ts` — pure helper module exporting `CollectionSeverity`, `getCollectionSeverity`, `sortCollectionsBySeverity`.
- `lib/utils/__tests__/collectionSeverity.test.ts` — unit tests for the helper.
- `components/HillChartApp.collection-severity.test.tsx` — source-string integration test matching the repo's existing pattern (see `HillChartApp.ellipsis-menu.test.tsx`).

**Modified files:**
- `lib/services/supabaseService.ts` — select `created_at` in `fetchCollections` and include it in the returned `Collection`; include it in the `addCollection` optimistic return so newly added rows sort correctly before the next fetch.
- `components/HillChartApp.tsx` — extend the local `Collection` interface with `created_at?: string`; replace `nonTodayCollections` derivation with a sorted version; render a conditional floating status dot inside each collection button row; set an `aria-label` carrying the status.

**Unchanged:** sidebar search input, pagination wheel logic, collection action menu, edit/archive/delete flows, snapshot flow, release-line flow, export/import flow, RLS, migrations.

---

## Task 1: Add `getCollectionSeverity` pure helper (TDD)

**Files:**
- Create: `lib/utils/collectionSeverity.ts`
- Test: `lib/utils/__tests__/collectionSeverity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/utils/__tests__/collectionSeverity.test.ts`:

```ts
import { getCollectionSeverity, CollectionSeverity } from '../collectionSeverity'

const palette = {
  discovery: '#b0cdfb',
  upslope: '#a6e7be',
  dangerZone: '#f8b4b4',
  downslope: '#fcc7a1',
  done: '#d0bdfb',
}

const dot = (overrides: Partial<{ color: string; archived: boolean }> = {}) => ({
  id: Math.random().toString(36).slice(2),
  label: 'd',
  x: 0,
  y: 0,
  color: palette.upslope,
  size: 3,
  archived: false,
  flag_for_today: false,
  ...overrides,
})

const coll = (dots: ReturnType<typeof dot>[]) => ({
  id: 'c',
  name: 'c',
  status: 'active' as const,
  dots,
})

describe('getCollectionSeverity', () => {
  it('returns rank 6 with null indicator for an empty collection', () => {
    const result = getCollectionSeverity(coll([]), palette)
    expect(result.rank).toBe(6)
    expect(result.indicatorColor).toBeNull()
    expect(result.statusLabel).toBeNull()
  })

  it('returns rank 5 for a done-only collection', () => {
    const result = getCollectionSeverity(coll([dot({ color: palette.done })]), palette)
    expect(result.rank).toBe(5)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns rank 4 for a discovery-only collection', () => {
    const result = getCollectionSeverity(coll([dot({ color: palette.discovery })]), palette)
    expect(result.rank).toBe(4)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns rank 4 when discovery and done are mixed', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: palette.discovery }), dot({ color: palette.done })]),
      palette,
    )
    expect(result.rank).toBe(4)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns rank 3 with emerald indicator for on-track only', () => {
    const result = getCollectionSeverity(coll([dot({ color: palette.upslope })]), palette)
    expect(result.rank).toBe(3)
    expect(result.indicatorColor).toBe('emerald')
    expect(result.statusLabel).toBe('On Track')
  })

  it('returns rank 3 when on-track is mixed with done', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: palette.upslope }), dot({ color: palette.done })]),
      palette,
    )
    expect(result.rank).toBe(3)
    expect(result.indicatorColor).toBe('emerald')
  })

  it('returns rank 2 with amber indicator when at-risk is the worst', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: palette.downslope }), dot({ color: palette.upslope })]),
      palette,
    )
    expect(result.rank).toBe(2)
    expect(result.indicatorColor).toBe('amber')
    expect(result.statusLabel).toBe('At Risk')
  })

  it('returns rank 1 with red indicator when any dot is blocked', () => {
    const result = getCollectionSeverity(
      coll([
        dot({ color: palette.dangerZone }),
        dot({ color: palette.downslope }),
        dot({ color: palette.upslope }),
      ]),
      palette,
    )
    expect(result.rank).toBe(1)
    expect(result.indicatorColor).toBe('red')
    expect(result.statusLabel).toBe('Blocked')
  })

  it('ignores archived dots when computing severity', () => {
    const result = getCollectionSeverity(
      coll([
        dot({ color: palette.dangerZone, archived: true }),
        dot({ color: palette.upslope }),
      ]),
      palette,
    )
    expect(result.rank).toBe(3)
    expect(result.indicatorColor).toBe('emerald')
  })

  it('honors custom palettes (semantic slot, not literal color)', () => {
    const customPalette = { ...palette, dangerZone: '#ff8800' }
    const result = getCollectionSeverity(
      coll([dot({ color: '#ff8800' })]),
      customPalette,
    )
    expect(result.rank).toBe(1)
    expect(result.indicatorColor).toBe('red')
  })

  it('ignores dots whose color matches no palette slot', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: '#123456' })]),
      palette,
    )
    expect(result.rank).toBe(6)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns a correctly narrowed discriminated union', () => {
    const result: CollectionSeverity = getCollectionSeverity(
      coll([dot({ color: palette.dangerZone })]),
      palette,
    )
    if (result.rank === 1) {
      const color: 'red' = result.indicatorColor
      const label: 'Blocked' = result.statusLabel
      expect(color).toBe('red')
      expect(label).toBe('Blocked')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/utils/__tests__/collectionSeverity.test.ts --runInBand`
Expected: FAIL with "Cannot find module '../collectionSeverity'".

- [ ] **Step 3: Write minimal implementation**

Create `lib/utils/collectionSeverity.ts`:

```ts
export interface DotColorPreferences {
  discovery: string
  upslope: string
  dangerZone: string
  downslope: string
  done: string
}

interface CollectionDotLike {
  color: string
  archived?: boolean
}

export interface CollectionLike {
  dots: CollectionDotLike[]
}

export type CollectionSeverity =
  | { rank: 1; indicatorColor: 'red'; statusLabel: 'Blocked' }
  | { rank: 2; indicatorColor: 'amber'; statusLabel: 'At Risk' }
  | { rank: 3; indicatorColor: 'emerald'; statusLabel: 'On Track' }
  | { rank: 4; indicatorColor: null; statusLabel: null }
  | { rank: 5; indicatorColor: null; statusLabel: null }
  | { rank: 6; indicatorColor: null; statusLabel: null }

const RANK_BY_SLOT = {
  dangerZone: 1,
  downslope: 2,
  upslope: 3,
  discovery: 4,
  done: 5,
} as const

type SlotName = keyof typeof RANK_BY_SLOT

function slotForColor(color: string, palette: DotColorPreferences): SlotName | null {
  if (color === palette.dangerZone) return 'dangerZone'
  if (color === palette.downslope) return 'downslope'
  if (color === palette.upslope) return 'upslope'
  if (color === palette.discovery) return 'discovery'
  if (color === palette.done) return 'done'
  return null
}

export function getCollectionSeverity(
  collection: CollectionLike,
  palette: DotColorPreferences,
): CollectionSeverity {
  let bestRank = 6

  for (const dot of collection.dots) {
    if (dot.archived) continue
    const slot = slotForColor(dot.color, palette)
    if (!slot) continue
    const rank = RANK_BY_SLOT[slot]
    if (rank < bestRank) bestRank = rank
  }

  switch (bestRank) {
    case 1:
      return { rank: 1, indicatorColor: 'red', statusLabel: 'Blocked' }
    case 2:
      return { rank: 2, indicatorColor: 'amber', statusLabel: 'At Risk' }
    case 3:
      return { rank: 3, indicatorColor: 'emerald', statusLabel: 'On Track' }
    case 4:
      return { rank: 4, indicatorColor: null, statusLabel: null }
    case 5:
      return { rank: 5, indicatorColor: null, statusLabel: null }
    default:
      return { rank: 6, indicatorColor: null, statusLabel: null }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest lib/utils/__tests__/collectionSeverity.test.ts --runInBand`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/collectionSeverity.ts lib/utils/__tests__/collectionSeverity.test.ts
git commit -m "feat(severity): add getCollectionSeverity pure helper"
```

---

## Task 2: Add `sortCollectionsBySeverity` tie-breaker (TDD)

**Files:**
- Modify: `lib/utils/collectionSeverity.ts`
- Modify: `lib/utils/__tests__/collectionSeverity.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/utils/__tests__/collectionSeverity.test.ts`:

```ts
import { sortCollectionsBySeverity } from '../collectionSeverity'

describe('sortCollectionsBySeverity', () => {
  const make = (
    id: string,
    color: string,
    created_at?: string,
  ) => ({
    id,
    name: id,
    status: 'active' as const,
    created_at,
    dots: color ? [dot({ color })] : [],
  })

  it('orders strictly by severity rank when no ties', () => {
    const input = [
      make('done', palette.done),
      make('blocked', palette.dangerZone),
      make('ontrack', palette.upslope),
      make('atrisk', palette.downslope),
      make('discovery', palette.discovery),
      make('empty', ''),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['blocked', 'atrisk', 'ontrack', 'discovery', 'done', 'empty'])
  })

  it('breaks ties with created_at descending (newest first)', () => {
    const input = [
      make('oldest', palette.dangerZone, '2024-01-01T00:00:00.000Z'),
      make('newest', palette.dangerZone, '2025-01-01T00:00:00.000Z'),
      make('middle', palette.dangerZone, '2024-06-01T00:00:00.000Z'),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['newest', 'middle', 'oldest'])
  })

  it('keeps stable relative order when created_at is missing', () => {
    const input = [
      make('a', palette.upslope),
      make('b', palette.upslope),
      make('c', palette.upslope),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('places collections with created_at ahead of those without at the same rank', () => {
    const input = [
      make('no-date', palette.dangerZone),
      make('with-date', palette.dangerZone, '2025-01-01T00:00:00.000Z'),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['with-date', 'no-date'])
  })

  it('does not mutate the input array', () => {
    const input = [
      make('ontrack', palette.upslope),
      make('blocked', palette.dangerZone),
    ]
    const originalOrder = input.map((c) => c.id)
    sortCollectionsBySeverity(input, palette)
    expect(input.map((c) => c.id)).toEqual(originalOrder)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/utils/__tests__/collectionSeverity.test.ts --runInBand`
Expected: FAIL with "sortCollectionsBySeverity is not a function" (or module export error).

- [ ] **Step 3: Write minimal implementation**

Append to `lib/utils/collectionSeverity.ts`:

```ts
interface SortableCollection extends CollectionLike {
  created_at?: string
}

export function sortCollectionsBySeverity<T extends SortableCollection>(
  collections: readonly T[],
  palette: DotColorPreferences,
): T[] {
  const withRank = collections.map((collection, index) => ({
    collection,
    rank: getCollectionSeverity(collection, palette).rank,
    index,
  }))

  withRank.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    const aTs = a.collection.created_at ? Date.parse(a.collection.created_at) : NaN
    const bTs = b.collection.created_at ? Date.parse(b.collection.created_at) : NaN
    const aHas = !Number.isNaN(aTs)
    const bHas = !Number.isNaN(bTs)
    if (aHas && bHas) return bTs - aTs
    if (aHas) return -1
    if (bHas) return 1
    return a.index - b.index
  })

  return withRank.map((entry) => entry.collection)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest lib/utils/__tests__/collectionSeverity.test.ts --runInBand`
Expected: PASS, all 16 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/collectionSeverity.ts lib/utils/__tests__/collectionSeverity.test.ts
git commit -m "feat(severity): add sortCollectionsBySeverity with created_at tie-break"
```

---

## Task 3: Surface `created_at` from Supabase

**Files:**
- Modify: `components/HillChartApp.tsx:83-91` (`Collection` interface — the prerequisite so `supabaseService.ts` typechecks with the new field)
- Modify: `lib/services/supabaseService.ts:185` (SELECT clause in `fetchCollections`)
- Modify: `lib/services/supabaseService.ts:270-278` (returned object in `fetchCollections`)
- Modify: `lib/services/supabaseService.ts:339` (returned object in `addCollection`)

`lib/services/supabaseService.ts` imports `Collection` from `@/components/HillChartApp`, so the interface extension must land here (before the return-value change) to keep the build green at every commit.

No test file change in this task — the helper tests remain green and Task 6 adds a source-string integration assertion.

- [ ] **Step 1: Extend the `Collection` interface**

In `components/HillChartApp.tsx` around lines 83-91, change:

```ts
export interface Collection {
  id: string
  name: string
  status: 'active' | 'archived' | 'deleted'
  archived_at?: string
  deleted_at?: string
  dots: Dot[]
  releaseLineConfig?: ReleaseLineConfig
}
```

to:

```ts
export interface Collection {
  id: string
  name: string
  status: 'active' | 'archived' | 'deleted'
  archived_at?: string
  deleted_at?: string
  created_at?: string
  dots: Dot[]
  releaseLineConfig?: ReleaseLineConfig
}
```

- [ ] **Step 2: Add `created_at` to the SELECT**

In `lib/services/supabaseService.ts` around line 185, change:

```ts
.select("id, name_encrypted, name_hash, status, archived_at, deleted_at, release_line_config_encrypted")
```

to:

```ts
.select("id, name_encrypted, name_hash, status, archived_at, deleted_at, release_line_config_encrypted, created_at")
```

- [ ] **Step 3: Pass `created_at` through the decryption mapping**

In `lib/services/supabaseService.ts` around lines 270-278, change:

```ts
return {
  id: decryptedCollection.id,
  name: decryptedCollection.name,
  status: collection.status as 'active' | 'archived' | 'deleted',
  archived_at: collection.archived_at,
  deleted_at: collection.deleted_at,
  dots: decryptedDots,
  releaseLineConfig
}
```

to:

```ts
return {
  id: decryptedCollection.id,
  name: decryptedCollection.name,
  status: collection.status as 'active' | 'archived' | 'deleted',
  archived_at: collection.archived_at,
  deleted_at: collection.deleted_at,
  created_at: collection.created_at,
  dots: decryptedDots,
  releaseLineConfig
}
```

- [ ] **Step 4: Include `created_at` in the optimistic add return**

In `lib/services/supabaseService.ts` around line 339, change:

```ts
const result = data ? { ...validatedCollection, dots: [] } : null
```

to:

```ts
const result = data
  ? {
      ...validatedCollection,
      dots: [],
      created_at:
        (Array.isArray(data) && data[0]?.created_at) || new Date().toISOString(),
    }
  : null
```

This prefers the server-side timestamp returned from `.insert().select()` and falls back to the client clock if the row shape is unexpected, so newly created collections sort correctly before the next full refetch.

- [ ] **Step 5: Run the type checker and existing tests**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no type errors).

Run: `pnpm exec jest --runInBand`
Expected: all existing tests still pass. Helper tests from Tasks 1–2 still pass.

- [ ] **Step 6: Commit**

```bash
git add components/HillChartApp.tsx lib/services/supabaseService.ts
git commit -m "feat(collections): surface created_at on fetch and optimistic add"
```

---

## Task 4: Apply severity sort in `HillChartApp`

**Files:**
- Modify: `components/HillChartApp.tsx` (new import block near other `@/lib` imports)
- Modify: `components/HillChartApp.tsx:849` (`nonTodayCollections` derivation)

- [ ] **Step 1: Import the sort helper and severity accessor**

In `components/HillChartApp.tsx`, near the other `@/lib` imports (after the imports on lines 60-70, anywhere before the component function), add:

```ts
import {
  getCollectionSeverity,
  sortCollectionsBySeverity,
  type CollectionSeverity,
} from "@/lib/utils/collectionSeverity"
```

- [ ] **Step 2: Replace `nonTodayCollections` with sorted version**

In `components/HillChartApp.tsx` around line 849, change:

```ts
const nonTodayCollections = collections.filter((collection) => collection.id !== todayCollectionId)
```

to:

```ts
const nonTodayCollections = sortCollectionsBySeverity(
  collections.filter((collection) => collection.id !== todayCollectionId),
  dotColors,
)
```

- [ ] **Step 3: Run the type checker and existing tests**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

Run: `pnpm exec jest --runInBand`
Expected: all tests pass. The existing `HillChartApp.collection-mutations.test.tsx` (source-string assertions) still passes.

- [ ] **Step 4: Commit**

```bash
git add components/HillChartApp.tsx
git commit -m "feat(sidebar): sort non-Today collections by severity"
```

---

## Task 5: Render the floating status dot and status-aware `aria-label`

**Files:**
- Modify: `components/HillChartApp.tsx:2702-2713` (collection row render)

The same render path serves both the Today row (pinned first) and normal collections because both flow through `paginatedCollectionsForSidebar`. The conditional `{!isTodayCollection && ...}` block for the `...` menu stays untouched; the floating dot is placed as a sibling of the button inside the existing `className="relative"` wrapper.

- [ ] **Step 1: Compute severity per row and render the dot**

In `components/HillChartApp.tsx` around line 2702, replace the non-editing render branch:

```tsx
) : (
  <>
    <button
      type="button"
      onClick={() => handleCollectionSelect(collection)}
      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${isSelectedCollection
        ? "border-primary/40 bg-primary/10 text-foreground"
        : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
        } ${isTodayCollection ? "pr-3" : "pr-10"}`}
    >
      <span className="block truncate">{collection.name}</span>
    </button>
```

with:

```tsx
) : (
  <>
    {(() => {
      const severity = getCollectionSeverity(collection, dotColors)
      const ariaLabel = severity.statusLabel
        ? `${collection.name}, ${severity.statusLabel}`
        : collection.name
      return (
        <>
          <button
            type="button"
            onClick={() => handleCollectionSelect(collection)}
            aria-label={ariaLabel}
            className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${isSelectedCollection
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
              } ${isTodayCollection ? "pr-3" : "pr-10"}`}
          >
            <span className="block truncate">{collection.name}</span>
          </button>
          {severity.indicatorColor && (
            <span
              aria-hidden="true"
              data-testid="collection-severity-dot"
              className={cn(
                "pointer-events-none absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                severity.indicatorColor === "red" && "bg-red-500 dark:bg-red-400",
                severity.indicatorColor === "amber" && "bg-amber-400 dark:bg-amber-300",
                severity.indicatorColor === "emerald" && "bg-emerald-500 dark:bg-emerald-400",
              )}
            />
          )}
        </>
      )
    })()}
```

Leave the immediately-following `{!isTodayCollection && ( ... action menu ...) }` block unchanged. The closing `</>` / `)}` on that branch remains as-is.

- [ ] **Step 2: Ensure `cn` is imported**

`components/HillChartApp.tsx` does not currently import `cn`. Add to the `@/lib` imports block near other local imports:

```ts
import { cn } from "@/lib/utils"
```

If an identical import already exists (grep the file for `from "@/lib/utils"`), skip this step.

- [ ] **Step 3: Run the type checker and existing tests**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

Run: `pnpm exec jest --runInBand`
Expected: all tests still pass.

- [ ] **Step 4: Smoke-build to catch Tailwind/JSX regressions**

Run: `pnpm exec next build 2>&1 | tail -20`
Expected: build completes without errors. If it fails, read the error and fix before committing. (If `next build` is slow, `pnpm exec tsc --noEmit` plus `pnpm exec next lint` is an acceptable substitute.)

- [ ] **Step 5: Commit**

```bash
git add components/HillChartApp.tsx
git commit -m "feat(sidebar): render floating severity dot and status aria-label"
```

---

## Task 6: Add integration test for sidebar wiring

**Files:**
- Create: `components/HillChartApp.collection-severity.test.tsx`

This follows the repo's existing source-string test pattern (see `components/HillChartApp.ellipsis-menu.test.tsx` and `components/HillChartApp.collection-mutations.test.tsx`). Full rendering-based tests of `HillChartApp` are out of scope here because it imports auth, Supabase, and service-worker modules that would require heavy mocking; the behavior is already covered by unit tests on the pure helper.

- [ ] **Step 1: Write the failing test**

Create `components/HillChartApp.collection-severity.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import fs from 'fs'
import path from 'path'

const componentPath = path.join(__dirname, 'HillChartApp.tsx')
const componentSource = fs.readFileSync(componentPath, 'utf8')

describe('HillChartApp sidebar severity wiring', () => {
  it('imports the severity helpers from @/lib/utils/collectionSeverity', () => {
    expect(componentSource).toMatch(
      /from\s+["']@\/lib\/utils\/collectionSeverity["']/,
    )
    expect(componentSource).toContain('getCollectionSeverity')
    expect(componentSource).toContain('sortCollectionsBySeverity')
  })

  it('sorts non-Today collections with sortCollectionsBySeverity', () => {
    expect(componentSource).toMatch(
      /sortCollectionsBySeverity\(\s*collections\.filter\(\(collection\)\s*=>\s*collection\.id\s*!==\s*todayCollectionId\)\s*,\s*dotColors\s*,?\s*\)/,
    )
  })

  it('renders the floating severity dot with ring-2 ring-background and pointer-events-none', () => {
    expect(componentSource).toContain('data-testid="collection-severity-dot"')
    expect(componentSource).toContain('pointer-events-none absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-background')
  })

  it('maps each indicator color to the correct Tailwind classes', () => {
    expect(componentSource).toContain('severity.indicatorColor === "red" && "bg-red-500 dark:bg-red-400"')
    expect(componentSource).toContain('severity.indicatorColor === "amber" && "bg-amber-400 dark:bg-amber-300"')
    expect(componentSource).toContain('severity.indicatorColor === "emerald" && "bg-emerald-500 dark:bg-emerald-400"')
  })

  it('computes the aria-label from severity.statusLabel', () => {
    expect(componentSource).toMatch(
      /aria-label=\{ariaLabel\}/,
    )
    expect(componentSource).toMatch(
      /severity\.statusLabel\s*\n?\s*\?\s*`\$\{collection\.name\},\s*\$\{severity\.statusLabel\}`\s*\n?\s*:\s*collection\.name/,
    )
  })

  it('extends the Collection interface with an optional created_at field', () => {
    expect(componentSource).toMatch(/created_at\?:\s*string/)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm exec jest components/HillChartApp.collection-severity.test.tsx --runInBand`
Expected: PASS, 6 tests.

Rationale for writing this as a "write-and-it-passes" test rather than red-then-green: Tasks 4 and 5 have already landed the wiring these assertions check. The test exists to lock the wiring in against regressions, matching the repo's existing source-string test pattern (`HillChartApp.ellipsis-menu.test.tsx` is written the same way).

- [ ] **Step 3: Run the full test suite**

Run: `pnpm exec jest --runInBand`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/HillChartApp.collection-severity.test.tsx
git commit -m "test(sidebar): lock severity sort + indicator wiring"
```

---

## Task 7: Manual QA pass

Run through the spec's manual QA checklist before considering the feature done. No commits in this task.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev` (or `PORT=3001 pnpm dev` if 3000 is in use).
Expected: server starts and listens on the chosen port.

- [ ] **Step 2: Exercise the sidebar in light mode**

Open the app in a browser, sign in, and:

- Seed or select a user with several collections spanning every severity bucket.
- Confirm ordering: Today (if enabled) is first; then Blocked, At Risk, On Track, Discovery, Done, Empty.
- Confirm the floating red/amber/emerald dot appears at the top-right of rows with active-status dots and is absent on Discovery-only, Done-only, and Empty rows.
- Change a Blocked dot to On Track in a Blocked collection; confirm the row reorders and the dot turns green.
- Archive the last red dot in a Blocked collection; confirm the row drops to the rank-3 band and the dot turns green.

- [ ] **Step 3: Exercise the sidebar in dark mode**

Switch to the dark theme via the ellipsis menu. Repeat the visual check — dots should still be clearly visible against the darker button backgrounds (red-400, amber-300, emerald-400).

- [ ] **Step 4: Verify search preserves severity order**

Type a query that matches multiple collections across severity buckets. Confirm matches appear in severity order inside the filtered list, and pagination still works via the mouse wheel.

- [ ] **Step 5: Verify accessibility**

Focus a collection row via keyboard. With a screen reader (VoiceOver, NVDA, or Chrome's a11y panel), confirm the announcement includes the status suffix for ranks 1-3 (e.g. "Q2 Launch, Blocked") and omits it for ranks 4-6.

- [ ] **Step 6: Verify non-regressions**

- Edit, archive, and delete a collection via the `...` menu.
- Create a new collection from the sidebar; confirm it lands in the correct severity bucket (Empty → bottom unless it inherits dots via some other path).
- Open the Today collection; confirm it's still pinned first and, if it has active-status dots, shows the correct floating dot.

- [ ] **Step 7: Stop the dev server**

Stop with Ctrl+C in the dev terminal.

---

## Rollback

If the feature needs to be reverted, `git revert` the commits from Tasks 1-6 in reverse order. No schema changes, no data migrations, so rollback is a pure code revert.

## Acceptance

Feature is done when:

- All tests in `lib/utils/__tests__/collectionSeverity.test.ts` and `components/HillChartApp.collection-severity.test.tsx` pass.
- Full `pnpm exec jest --runInBand` run is green.
- `pnpm exec tsc --noEmit` is clean.
- Manual QA checklist in Task 7 has been walked through.
