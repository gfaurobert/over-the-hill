# Collections Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the layout-first collections workspace redesign from `Collections Redesign High Fidelity` in `DESIGN.pen` while preserving current product behavior for collections, snapshots, chart interactions, and dots management.

**Architecture:** Keep `HillChartApp` as the stateful container for the first pass, but extract the render surface into focused panel components under `components/hill-chart/`. Move shared interfaces into a local `types.ts` file so the new panels can stay strongly typed without creating circular imports, then wire the existing handlers and derived state into the new layout shell.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Jest, Testing Library

---

## File Structure

### Planned file boundaries

- Modify: `components/HillChartApp.tsx`
  - Keep service calls, state ownership, derived collections/snapshot/dots state, and modal flows.
  - Replace the large inline workspace JSX with a panel-based layout.
- Create: `components/hill-chart/types.ts`
  - Shared interfaces for `Dot`, `Collection`, `Snapshot`, `ReleaseLineConfig`, and small panel prop helpers if needed.
- Create: `components/hill-chart/collections-rail.tsx`
  - Render the left rail, selected state, collection actions, and new collection affordance.
- Create: `components/hill-chart/chart-panel.tsx`
  - Render the main chart card shell and receive the existing chart internals via props or children.
- Create: `components/hill-chart/snapshot-panel.tsx`
  - Render the right-side snapshot card shell, collection field area, month navigation, calendar slot, and snapshot action button.
- Create: `components/hill-chart/dots-panel.tsx`
  - Render the dots card shell, add-dot input, batch-action row, and dot card grid.
- Create: `components/hill-chart/__tests__/workspace-layout.test.tsx`
  - Regression tests for the new panel composition and prop-driven rendering.
- Modify: `components/HillChartApp.collection-mutations.test.tsx`
  - Keep existing source-level guardrails or update them if collection action call sites move.
- Modify: `components/HillChartApp.ellipsis-menu.test.tsx`
  - Keep or trim source-level assertions so they still reflect the post-extraction component structure.

### Notes before implementation

- Preserve the current Today collection rules and current service function signatures.
- Keep modal-based settings and confirmation flows in `HillChartApp` for this pass.
- The current local dev session shows a `tailwindcss` resolution issue. Fix that before browser-level visual validation, but do not couple the redesign tasks to unrelated build-system refactors.

### Task 1: Extract shared workspace types

**Files:**
- Create: `components/hill-chart/types.ts`
- Modify: `components/HillChartApp.tsx`
- Test: `components/hill-chart/__tests__/workspace-layout.test.tsx`

- [ ] **Step 1: Write the failing type-import test**

Create `components/hill-chart/__tests__/workspace-layout.test.tsx` with a minimal import smoke test that will fail before the new type module exists:

```tsx
/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import type { Collection, Dot, Snapshot, ReleaseLineConfig } from '../types'

describe('hill-chart shared types', () => {
  it('exports workspace domain types for panel components', () => {
    const collection: Collection = {
      id: 'collection-1',
      name: 'Test',
      status: 'active',
      dots: [],
    }

    const dot: Dot = {
      id: 'dot-1',
      label: 'A',
      x: 50,
      y: 80,
      color: '#b0cdfb',
      size: 1,
      archived: false,
    }

    const snapshot: Snapshot = {
      date: '2026-04-16',
      collectionId: collection.id,
      collectionName: collection.name,
      dots: [dot],
      timestamp: 1,
    }

    const releaseLineConfig: ReleaseLineConfig = {
      enabled: false,
      color: '#ff00ff',
      text: '',
    }

    expect(snapshot.collectionId).toBe(collection.id)
    expect(releaseLineConfig.enabled).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --runTestsByPath components/hill-chart/__tests__/workspace-layout.test.tsx`

Expected: FAIL with a module resolution error for `../types` or missing exported interfaces.

- [ ] **Step 3: Write the minimal shared type module**

Create `components/hill-chart/types.ts`:

```ts
export interface Dot {
  id: string
  label: string
  x: number
  y: number
  color: string
  size: number
  archived: boolean
  flag_for_today?: boolean
}

export interface ReleaseLineConfig {
  enabled: boolean
  color: string
  text: string
}

export interface Collection {
  id: string
  name: string
  status: 'active' | 'archived' | 'deleted'
  archived_at?: string
  deleted_at?: string
  dots: Dot[]
  releaseLineConfig?: ReleaseLineConfig
}

export interface Snapshot {
  date: string
  collectionId: string
  collectionName: string
  dots: Dot[]
  timestamp: number
  releaseLineConfig?: ReleaseLineConfig
}
```

Then update `components/HillChartApp.tsx` to import these types and remove the duplicated local interface definitions:

```tsx
import type { Collection, Dot, ReleaseLineConfig, Snapshot } from './hill-chart/types'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --runTestsByPath components/hill-chart/__tests__/workspace-layout.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/HillChartApp.tsx components/hill-chart/types.ts components/hill-chart/__tests__/workspace-layout.test.tsx
git commit -m "refactor: extract hill chart workspace types"
```

### Task 2: Build the collections rail and snapshot panel shells

**Files:**
- Create: `components/hill-chart/collections-rail.tsx`
- Create: `components/hill-chart/snapshot-panel.tsx`
- Modify: `components/HillChartApp.tsx`
- Test: `components/hill-chart/__tests__/workspace-layout.test.tsx`

- [ ] **Step 1: Write the failing panel composition test**

Expand `components/hill-chart/__tests__/workspace-layout.test.tsx` with prop-driven rendering tests:

```tsx
import { render, screen } from '@testing-library/react'
import { CollectionsRail } from '../collections-rail'
import { SnapshotPanel } from '../snapshot-panel'

describe('workspace side panels', () => {
  it('renders the collections rail with a selected collection and actions', () => {
    render(
      <CollectionsRail
        isCollapsed={false}
        collections={[
          { id: 'c1', name: 'Roadmap', status: 'active', dots: [] },
          { id: 'c2', name: 'Today', status: 'active', dots: [] },
        ]}
        selectedCollectionId="c1"
        onSelectCollection={() => undefined}
        onCreateCollection={() => undefined}
        onToggleCollapsed={() => undefined}
        onEditCollection={() => undefined}
        onArchiveCollection={() => undefined}
        onDeleteCollection={() => undefined}
      />
    )

    expect(screen.getByText('Collections')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new collection/i })).toBeInTheDocument()
    expect(screen.getByText('Roadmap')).toBeInTheDocument()
  })

  it('renders the snapshot panel structure', () => {
    render(
      <SnapshotPanel
        collectionName="Roadmap"
        monthLabel="April 2026"
        onPreviousMonth={() => undefined}
        onNextMonth={() => undefined}
        onCreateSnapshot={() => undefined}
        isSnapshotSuccess={false}
      >
        <div>calendar-slot</div>
      </SnapshotPanel>
    )

    expect(screen.getByText('Snapshots')).toBeInTheDocument()
    expect(screen.getByText('April 2026')).toBeInTheDocument()
    expect(screen.getByText('calendar-slot')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --runTestsByPath components/hill-chart/__tests__/workspace-layout.test.tsx`

Expected: FAIL because `CollectionsRail` and `SnapshotPanel` do not exist yet.

- [ ] **Step 3: Write the minimal panel implementations**

Create `components/hill-chart/collections-rail.tsx`:

```tsx
import { PanelLeftClose, Plus, Pencil, Archive, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import type { Collection } from './types'

interface CollectionsRailProps {
  isCollapsed: boolean
  collections: Collection[]
  selectedCollectionId: string | null
  onSelectCollection: (collectionId: string) => void
  onCreateCollection: () => void
  onToggleCollapsed: () => void
  onEditCollection: (collectionId: string) => void
  onArchiveCollection: (collectionId: string) => void
  onDeleteCollection: (collectionId: string) => void
}

export function CollectionsRail({
  isCollapsed,
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onToggleCollapsed,
  onEditCollection,
  onArchiveCollection,
  onDeleteCollection,
}: CollectionsRailProps) {
  return (
    <aside className={cn('rounded-[18px] border bg-background p-4 shadow-sm', isCollapsed ? 'w-20' : 'w-full')}>
      <div className="mb-4 flex items-center justify-between gap-2">
        {!isCollapsed && <h2 className="text-lg font-semibold">Collections</h2>}
        <Button variant="outline" size="icon" onClick={onToggleCollapsed} aria-label="Toggle collections rail">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className={cn(
              'rounded-xl border p-3',
              collection.id === selectedCollectionId && 'border-primary bg-primary/5'
            )}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelectCollection(collection.id)}>
              {collection.name}
            </button>

            {!isCollapsed && collection.id === selectedCollectionId && (
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onEditCollection(collection.id)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => onArchiveCollection(collection.id)}><Archive className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => onDeleteCollection(collection.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button className="w-full" onClick={onCreateCollection}>
          <Plus className="mr-2 h-4 w-4" />
          New Collection
        </Button>
      </div>
    </aside>
  )
}
```

Create `components/hill-chart/snapshot-panel.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Button } from '../ui/button'

interface SnapshotPanelProps {
  collectionName: string
  monthLabel: string
  isSnapshotSuccess: boolean
  onPreviousMonth: () => void
  onNextMonth: () => void
  onCreateSnapshot: () => void
  children: ReactNode
}

export function SnapshotPanel({
  collectionName,
  monthLabel,
  isSnapshotSuccess,
  onPreviousMonth,
  onNextMonth,
  onCreateSnapshot,
  children,
}: SnapshotPanelProps) {
  return (
    <section className="rounded-2xl border bg-background p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground">Collection</p>
        <div className="mt-2 rounded-md border bg-background px-3 py-2 text-sm">{collectionName}</div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-medium">Snapshots</h2>
        <div className="mt-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onPreviousMonth} aria-label="Previous month">Prev</Button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <Button variant="ghost" size="sm" onClick={onNextMonth} aria-label="Next month">Next</Button>
        </div>
      </div>

      <div className="mb-4">{children}</div>

      <Button variant="outline" className="w-full" onClick={onCreateSnapshot}>
        {isSnapshotSuccess ? 'New Snapshot Created' : 'Snapshot'}
      </Button>
    </section>
  )
}
```

Integrate both into `components/HillChartApp.tsx` by replacing the current collection input dropdown area and right-side snapshot card wrapper with these components while keeping existing handlers:

```tsx
<CollectionsRail
  isCollapsed={isCollectionsRailCollapsed}
  collections={nonTodayCollections}
  selectedCollectionId={selectedCollection}
  onSelectCollection={(collectionId) => setSelectedCollection(collectionId)}
  onCreateCollection={() => inputRef.current?.focus()}
  onToggleCollapsed={() => setIsCollectionsRailCollapsed((previous) => !previous)}
  onEditCollection={(collectionId) => {
    const collection = collections.find((item) => item.id === collectionId)
    if (collection) startEditCollection(collection)
  }}
  onArchiveCollection={(collectionId) => {
    const collection = collections.find((item) => item.id === collectionId)
    if (collection) setArchiveConfirm({ collectionId, collectionName: collection.name })
  }}
  onDeleteCollection={(collectionId) => {
    const collection = collections.find((item) => item.id === collectionId)
    if (collection) setDeleteCollectionConfirm({ collectionId, collectionName: collection.name })
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --runTestsByPath components/hill-chart/__tests__/workspace-layout.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/HillChartApp.tsx components/hill-chart/collections-rail.tsx components/hill-chart/snapshot-panel.tsx components/hill-chart/__tests__/workspace-layout.test.tsx
git commit -m "feat: add collections rail and snapshot panel shells"
```

### Task 3: Build the chart and dots panel shells

**Files:**
- Create: `components/hill-chart/chart-panel.tsx`
- Create: `components/hill-chart/dots-panel.tsx`
- Modify: `components/HillChartApp.tsx`
- Test: `components/hill-chart/__tests__/workspace-layout.test.tsx`

- [ ] **Step 1: Write the failing chart and dots panel test**

Extend `components/hill-chart/__tests__/workspace-layout.test.tsx`:

```tsx
import { ChartPanel } from '../chart-panel'
import { DotsPanel } from '../dots-panel'

it('renders chart and dots panel shells', () => {
  const { getByText, getByPlaceholderText } = render(
    <>
      <ChartPanel toolbar={<div>toolbar-slot</div>}>
        <div>chart-slot</div>
      </ChartPanel>

      <DotsPanel
        newDotLabel=""
        onNewDotLabelChange={() => undefined}
        onAddDot={() => undefined}
        onToggleSort={() => undefined}
        batchActions={<div>batch-slot</div>}
      >
        <div>dot-card-slot</div>
      </DotsPanel>
    </>
  )

  expect(getByText('toolbar-slot')).toBeInTheDocument()
  expect(getByText('chart-slot')).toBeInTheDocument()
  expect(getByText('Dots')).toBeInTheDocument()
  expect(getByPlaceholderText('Enter dot name and press Enter to add...')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --runTestsByPath components/hill-chart/__tests__/workspace-layout.test.tsx`

Expected: FAIL because `ChartPanel` and `DotsPanel` do not exist yet.

- [ ] **Step 3: Write the minimal chart and dots shells**

Create `components/hill-chart/chart-panel.tsx`:

```tsx
import type { ReactNode } from 'react'

interface ChartPanelProps {
  toolbar: ReactNode
  children: ReactNode
}

export function ChartPanel({ toolbar, children }: ChartPanelProps) {
  return (
    <section className="rounded-3xl border bg-background shadow-[0px_16px_20px_5px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between px-4 py-3">{toolbar}</div>
      <div className="p-3 pt-0">{children}</div>
    </section>
  )
}
```

Create `components/hill-chart/dots-panel.tsx`:

```tsx
import type { KeyboardEvent, ReactNode } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface DotsPanelProps {
  newDotLabel: string
  onNewDotLabelChange: (value: string) => void
  onAddDot: () => void
  onToggleSort: () => void
  batchActions: ReactNode
  children: ReactNode
}

export function DotsPanel({
  newDotLabel,
  onNewDotLabelChange,
  onAddDot,
  onToggleSort,
  batchActions,
  children,
}: DotsPanelProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onAddDot()
  }

  return (
    <section className="rounded-2xl border bg-background shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold">Dots</h2>
        <Button variant="ghost" size="sm" onClick={onToggleSort} aria-label="Sort dots by position">
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 px-4 pb-4 pt-0">
        <Input
          placeholder="Enter dot name and press Enter to add..."
          value={newDotLabel}
          onChange={(event) => onNewDotLabelChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {batchActions}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </div>
    </section>
  )
}
```

Refactor the large return block in `components/HillChartApp.tsx` to wrap the existing chart SVG, snapshot calendar, and dot card map inside the new panel shells:

```tsx
<div className="grid gap-4 lg:grid-cols-[258px_minmax(0,1fr)]">
  <CollectionsRail {...railProps} />

  <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_406px]">
      <ChartPanel toolbar={chartToolbar}>{chartContent}</ChartPanel>
      <SnapshotPanel {...snapshotPanelProps}>{renderCalendar()}</SnapshotPanel>
    </div>

    <DotsPanel
      newDotLabel={newDotLabel}
      onNewDotLabelChange={setNewDotLabel}
      onAddDot={addDot}
      onToggleSort={sortCurrentCollectionDotsByX}
      batchActions={dotsBatchActions}
    >
      {dotCards}
    </DotsPanel>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --runTestsByPath components/hill-chart/__tests__/workspace-layout.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/HillChartApp.tsx components/hill-chart/chart-panel.tsx components/hill-chart/dots-panel.tsx components/hill-chart/__tests__/workspace-layout.test.tsx
git commit -m "feat: extract chart and dots workspace panels"
```

### Task 4: Wire the redesign layout to current behavior

**Files:**
- Modify: `components/HillChartApp.tsx`
- Modify: `components/HillChartApp.collection-mutations.test.tsx`
- Modify: `components/HillChartApp.ellipsis-menu.test.tsx`
- Test: `components/hill-chart/__tests__/workspace-layout.test.tsx`

- [ ] **Step 1: Write the failing integration-focused source assertions**

Update `components/HillChartApp.collection-mutations.test.tsx` so it guards the new layout integration instead of only the old inline structure:

```tsx
expect(componentSource).toContain('<CollectionsRail')
expect(componentSource).toContain('archiveCollection(user.id, collectionId)')
expect(componentSource).toContain('deleteCollection(user.id, collectionId)')
```

Update `components/HillChartApp.ellipsis-menu.test.tsx` so it still guards release line integration after extraction:

```tsx
expect(componentSource).toContain('<ChartPanel')
expect(componentSource).toContain('<ReleaseLineSettings')
expect(componentSource).toContain('onConfigChange={handleReleaseLineConfigChange}')
```

- [ ] **Step 2: Run tests to verify they fail before final wiring**

Run: `pnpm test -- --runTestsByPath components/HillChartApp.collection-mutations.test.tsx components/HillChartApp.ellipsis-menu.test.tsx`

Expected: FAIL until `HillChartApp.tsx` is fully updated to the new panel composition.

- [ ] **Step 3: Finish the layout wiring in `HillChartApp.tsx`**

Add the minimal parent-side state and derived props needed to make the new layout behave like the current UI:

```tsx
const [isCollectionsRailCollapsed, setIsCollectionsRailCollapsed] = useState(false)

const visibleRailCollections = collections.filter((collection) => collection.id !== todayCollectionId)

function sortCurrentCollectionDotsByX() {
  setCollections((previous) =>
    previous.map((collection) =>
      collection.id === selectedCollection
        ? { ...collection, dots: [...collection.dots].sort((left, right) => right.x - left.x) }
        : collection
    )
  )
}

const snapshotPanelProps = {
  collectionName: currentCollection?.name ?? 'No collection selected',
  monthLabel: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  isSnapshotSuccess: snapshotSuccess,
  onPreviousMonth: () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)),
  onNextMonth: () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)),
  onCreateSnapshot: createNewSnapshot,
}
```

Then preserve the existing handlers and flows:

```tsx
const railProps = {
  isCollapsed: isCollectionsRailCollapsed,
  collections: visibleRailCollections,
  selectedCollectionId: selectedCollection,
  onSelectCollection: (collectionId: string) => {
    setSelectedCollection(collectionId)
    const collection = visibleRailCollections.find((item) => item.id === collectionId)
    if (collection) setCollectionInput(collection.name)
  },
  onCreateCollection: () => inputRef.current?.focus(),
  onToggleCollapsed: () => setIsCollectionsRailCollapsed((previous) => !previous),
  onEditCollection: handleRailEditCollection,
  onArchiveCollection: handleRailArchiveCollection,
  onDeleteCollection: handleRailDeleteCollection,
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `pnpm test -- --runTestsByPath components/hill-chart/__tests__/workspace-layout.test.tsx components/HillChartApp.collection-mutations.test.tsx components/HillChartApp.ellipsis-menu.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/HillChartApp.tsx components/HillChartApp.collection-mutations.test.tsx components/HillChartApp.ellipsis-menu.test.tsx components/hill-chart/__tests__/workspace-layout.test.tsx
git commit -m "feat: wire collections redesign layout to existing behaviors"
```

### Task 5: Verify styling, lint status, and regressions

**Files:**
- Modify: `components/HillChartApp.tsx`
- Modify: `components/hill-chart/collections-rail.tsx`
- Modify: `components/hill-chart/chart-panel.tsx`
- Modify: `components/hill-chart/snapshot-panel.tsx`
- Modify: `components/hill-chart/dots-panel.tsx`
- Test: `components/hill-chart/__tests__/workspace-layout.test.tsx`

- [ ] **Step 1: Run targeted tests and capture any failures**

Run:

```bash
pnpm test -- --runTestsByPath \
  components/hill-chart/__tests__/workspace-layout.test.tsx \
  components/HillChartApp.collection-mutations.test.tsx \
  components/HillChartApp.ellipsis-menu.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run lint or diagnostics on changed files**

Run:

```bash
pnpm eslint \
  components/HillChartApp.tsx \
  components/hill-chart/types.ts \
  components/hill-chart/collections-rail.tsx \
  components/hill-chart/chart-panel.tsx \
  components/hill-chart/snapshot-panel.tsx \
  components/hill-chart/dots-panel.tsx
```

Expected: PASS or only pre-existing warnings that are explicitly understood.

- [ ] **Step 3: Fix any easy issues without broadening scope**

If lint or tests reveal issues, keep fixes narrow:

```tsx
// Good example: remove an unused prop after extraction
interface ChartPanelProps {
  toolbar: ReactNode
  children: ReactNode
}
```

```tsx
// Good example: keep event names aligned with panel props
<DotsPanel
  onNewDotLabelChange={setNewDotLabel}
  onAddDot={addDot}
/>
```

- [ ] **Step 4: Perform manual verification once the local dev issue is resolved**

Run:

```bash
PORT=3001 pnpm dev
```

Manual checklist:

- collections rail renders on the left and selected collection state is obvious
- chart card remains the visual center and dot dragging still works
- snapshot card sits on the right and the calendar plus snapshot button still work
- dots panel renders below and add-dot plus batch actions still work
- existing modals and confirmation flows still open from the redesigned workspace

Expected: all items verified, or any remaining issue documented before merge.

- [ ] **Step 5: Commit**

```bash
git add components/HillChartApp.tsx components/hill-chart/types.ts components/hill-chart/collections-rail.tsx components/hill-chart/chart-panel.tsx components/hill-chart/snapshot-panel.tsx components/hill-chart/dots-panel.tsx components/hill-chart/__tests__/workspace-layout.test.tsx components/HillChartApp.collection-mutations.test.tsx components/HillChartApp.ellipsis-menu.test.tsx
git commit -m "test: verify collections redesign workspace integration"
```

## Self-Review

### Spec coverage

- Left collections rail: covered by Tasks 2 and 4.
- Main chart card: covered by Task 3 and Task 4.
- Snapshot card: covered by Task 2 and Task 4.
- Dots panel: covered by Task 3 and Task 4.
- Preserve current behavior and conservative error handling: covered by Tasks 3 through 5.
- Targeted regression testing: covered by Tasks 1 through 5.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation notes remain.
- Each task includes exact file paths, commands, and concrete code snippets.

### Type consistency

- Shared domain interfaces are defined once in `components/hill-chart/types.ts`.
- Panel names and prop names are consistent across the tasks: `CollectionsRail`, `ChartPanel`, `SnapshotPanel`, `DotsPanel`.

