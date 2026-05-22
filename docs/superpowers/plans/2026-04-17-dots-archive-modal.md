# Dots Archive Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the obsolete manual-sort button in the Dots card header with an `Archive (N)` button that opens a searchable modal to unarchive or delete archived dots in the currently selected collection.

**Architecture:** All changes are local to `components/HillChartApp.tsx`. The modal follows the existing inline `fixed inset-0` modal pattern used by `deleteConfirm` / `archiveConfirm`. Unarchive reuses `updateDot(id, { archived: false })`. Delete reuses the existing `deleteConfirm` state and its confirm dialog — no new services, no new components.

**Tech Stack:** React, Next.js 16, Tailwind, Shadcn `Button` / `Input`, `lucide-react` icons (all already imported).

**Spec:** `docs/superpowers/specs/2026-04-17-dots-archive-modal-design.md`

---

## File Structure

All work in a single file:

- **Modify:** `components/HillChartApp.tsx`
    - Add 2 new `useState` declarations near the existing archive management state (~line 419).
    - Replace the header button in the Dots card (`ArrowUpDown` sort button, ~lines 3244-3262).
    - Remove the inline "Archived" section in `CardContent` (~lines 3596-3625).
    - Add 2 new `useEffect` blocks (auto-close on collection change, auto-close when empty) near other dot-related effects (~line 2287).
    - Add the new modal JSX next to the other modals (after the `batchDeleteConfirm` modal, before `showResetConfirm`, ~line 3670).

No new files. No new services. No new components.

---

## Task 1: Add Archive Modal State And Replace Sort Button

**Files:**
- Modify: `components/HillChartApp.tsx` around line 419 (state) and 3244-3262 (header button)

- [ ] **Step 1: Add the two new state declarations**

Find the line that reads:
```tsx
const [showArchivedCollectionsModal, setShowArchivedCollectionsModal] = useState(false)
```
and add the two new state declarations immediately after it:

```tsx
const [showArchiveModal, setShowArchiveModal] = useState(false)
const [archiveSearchQuery, setArchiveSearchQuery] = useState("")
```

- [ ] **Step 2: Replace the Dots card header sort button with the Archive button**

Find this block (currently ~lines 3242-3263):

```tsx
<CardHeader className="flex flex-row items-center justify-between py-3">
  <CardTitle className="text-lg">Dots</CardTitle>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === selectedCollection
            ? {
              ...collection,
              dots: [...collection.dots].sort((a, b) => b.x - a.x), // Sort by completion percentage (x position) descending
            }
            : collection,
        ),
      )
    }}
    className="h-8 w-8 p-0"
  >
    <ArrowUpDown className="w-4 h-4 text-gray-500" />
  </Button>
</CardHeader>
```

Replace it with:

```tsx
<CardHeader className="flex flex-row items-center justify-between py-3">
  <CardTitle className="text-lg">Dots</CardTitle>
  {archivedDots.length > 0 && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowArchiveModal(true)}
      className="h-8 px-2 text-xs"
      aria-label="Open archived dots"
    >
      <ArchiveIcon className="mr-1 h-3.5 w-3.5" />
      Archive ({archivedDots.length})
    </Button>
  )}
</CardHeader>
```

Note: `archivedDots` is declared at line ~2275 (`const archivedDots: Dot[] = (currentCollection?.dots || [])...`) so it's already in scope inside the JSX below it.

- [ ] **Step 3: Remove the now-unused `ArrowUpDown` import if no other usages**

Check for other usages:

Run: `rg "ArrowUpDown" components/HillChartApp.tsx`

If the only remaining hit is the import statement at line 11, remove `ArrowUpDown,` from the import list. If there are other usages, leave it.

- [ ] **Step 4: Manual verification — dev server**

Open the dashboard at `http://localhost:3001`, log in, and look at the Dots card header for a collection with no archived dots. Expected: no button to the right of the title. Now archive any dot via its action menu. Expected: a ghost button labeled `Archive (1)` with an archive icon appears in the header. Click it — nothing visible happens yet (modal is implemented in later tasks).

- [ ] **Step 5: Commit**

```bash
git add components/HillChartApp.tsx
git commit -m "Replace Dots sort button with Archive(N) opener

Adds showArchiveModal and archiveSearchQuery state. Removes the obsolete
manual-sort button (dots are already auto-sorted) and replaces it with a
ghost Archive(N) button that is only visible when the current collection
has at least one archived dot. Modal body implemented in follow-up tasks."
```

---

## Task 2: Render The Archive Modal Shell

Create the modal panel with header, close button, and an empty body. No search or list yet — just the frame, so we can verify open/close works.

**Files:**
- Modify: `components/HillChartApp.tsx` — add a new JSX block next to the other modals (place it after the `batchDeleteConfirm` modal, before `showResetConfirm`, roughly line 3670)

- [ ] **Step 1: Add the modal JSX**

Find the closing of the `batchDeleteConfirm` modal. It ends with the lines:
```tsx
      )}
      {showResetConfirm && (
```

Insert the following block between those two lines:

```tsx
      {showArchiveModal && currentCollection && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                Archived Dots — {currentCollection.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setShowArchiveModal(false)
                  setArchiveSearchQuery("")
                }}
                aria-label="Close archived dots"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {archivedDots.length} archived dot{archivedDots.length === 1 ? "" : "s"}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowArchiveModal(false)
                  setArchiveSearchQuery("")
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Manual verification**

Refresh `http://localhost:3001`. With at least one archived dot in the current collection, click `Archive (N)` in the Dots header. Expected: a modal appears centered on a dimmed backdrop, titled `Archived Dots — <collection name>`, showing the count of archived dots and a `Close` button in the bottom right. Clicking the `X` icon in the header or the `Close` button dismisses the modal. Opening it again shows the same thing. Toggle dark mode — the panel should read cleanly in both themes.

- [ ] **Step 3: Commit**

```bash
git add components/HillChartApp.tsx
git commit -m "Add archive modal shell with open and close

Renders the modal frame, title, close button, and a placeholder body
showing the archived-dot count. Search input and list come next."
```

---

## Task 3: Add The Searchable List With Unarchive And Delete Actions

Replace the placeholder body with the real UI: a search input, a scrollable list of archived dots, and per-row `Unarchive` / `Delete` buttons.

**Files:**
- Modify: `components/HillChartApp.tsx` — the modal body added in Task 2

- [ ] **Step 1: Replace the modal body**

Find the block added in Task 2. Replace the inner body (the `<div className="text-sm text-muted-foreground">…</div>` and the footer `Close` row) with this full implementation, keeping the outer overlay, panel, and header row unchanged:

```tsx
      {showArchiveModal && currentCollection && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                Archived Dots — {currentCollection.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setShowArchiveModal(false)
                  setArchiveSearchQuery("")
                }}
                aria-label="Close archived dots"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Input
              value={archiveSearchQuery}
              onChange={(e) => setArchiveSearchQuery(e.target.value)}
              placeholder="Search archived dots..."
              maxLength={64}
              autoFocus
              className="mb-3 h-8 text-xs"
            />

            {(() => {
              const trimmedQuery = archiveSearchQuery.trim().toLowerCase()
              const filtered = trimmedQuery
                ? archivedDots.filter((dot) => dot.label.toLowerCase().includes(trimmedQuery))
                : archivedDots

              if (filtered.length === 0) {
                return (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {trimmedQuery
                      ? `No archived dots match "${archiveSearchQuery}".`
                      : "No archived dots."}
                  </div>
                )
              }

              return (
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  <ul className="flex flex-col gap-1.5">
                    {filtered.map((dot) => (
                      <li
                        key={dot.id}
                        className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: dot.color }}
                        />
                        <span className="flex-1 truncate text-xs font-medium">
                          {dot.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(dot.x)}%
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={async () => {
                            await updateDot(dot.id, { archived: false })
                          }}
                        >
                          <Undo2 className="mr-1 h-3 w-3" />
                          Unarchive
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px] text-destructive"
                          onClick={() =>
                            setDeleteConfirm({ dotId: dot.id, dotLabel: dot.label })
                          }
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowArchiveModal(false)
                  setArchiveSearchQuery("")
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Manual verification**

Refresh the dashboard. With a few archived dots in the selected collection:

1. Click `Archive (N)` → list of all archived dots appears, ordered top-to-bottom by `x` descending (same sort as `archivedDots` array).
2. Type a partial label → list filters live; non-matching text shows the `No archived dots match "..."` message.
3. Clear the search → full list returns.
4. Click `Unarchive` on any row → the row disappears from the list; open the Dots card below — that dot is back in the active list; the `Archive (N)` header count has decremented.
5. Click `Delete` on any row → the existing red `Delete Dot` confirm dialog appears on top of the archive modal. Cancel → dialog dismisses, archive modal still visible, row still present. Trigger `Delete` again and confirm → dialog dismisses, row is gone from the archive list, header count decremented.

- [ ] **Step 3: Commit**

```bash
git add components/HillChartApp.tsx
git commit -m "Add search, list, and unarchive/delete actions to archive modal

Client-side case-insensitive label filter, scrollable list capped at
60vh, colored swatch + label + percent + Unarchive + Delete per row.
Delete routes through the existing deleteConfirm dialog; unarchive
calls updateDot(id, { archived: false })."
```

---

## Task 4: Auto-Close Behaviors And Escape Key

Close the modal automatically when the user switches collections or empties the archive; close on `Escape` for keyboard parity.

**Files:**
- Modify: `components/HillChartApp.tsx` — add three effects near the existing dot-related effects (~line 2287)

- [ ] **Step 1: Add the three effects**

Find the existing effect that starts with:

```tsx
  useEffect(() => {
    if (dotsPage <= totalDotsPages) return
    setDotsPage(totalDotsPages)
  }, [dotsPage, totalDotsPages])
```

Immediately after it (before the next `useEffect` block that handles wheel events), insert:

```tsx
  useEffect(() => {
    if (!showArchiveModal) return
    setShowArchiveModal(false)
    setArchiveSearchQuery("")
  }, [selectedCollection])

  useEffect(() => {
    if (!showArchiveModal) return
    if (archivedDots.length > 0) return
    setShowArchiveModal(false)
    setArchiveSearchQuery("")
  }, [showArchiveModal, archivedDots.length])

  useEffect(() => {
    if (!showArchiveModal) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setShowArchiveModal(false)
      setArchiveSearchQuery("")
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showArchiveModal])
```

Note on the first effect: it intentionally watches only `selectedCollection`. Adding `showArchiveModal` to the deps would cause the modal to close itself immediately on open. The `if (!showArchiveModal) return` guard prevents redundant state writes when the modal is already closed. ESLint's exhaustive-deps rule may flag this — if so, add an inline `// eslint-disable-next-line react-hooks/exhaustive-deps` above the deps array.

- [ ] **Step 2: Manual verification**

1. Open the archive modal. Press `Escape`. Expected: modal closes.
2. Open the modal again. Click a different collection in the left rail. Expected: modal closes immediately; no stale title showing the previous collection.
3. Open the modal. Unarchive every dot in the list one by one. Expected: after the last one, the modal closes automatically; the `Archive (N)` header button disappears.
4. Open the modal. Delete every dot in the list via the confirm dialog. Expected: same result — modal auto-closes when the archive becomes empty.

- [ ] **Step 3: Commit**

```bash
git add components/HillChartApp.tsx
git commit -m "Auto-close archive modal on collection switch, empty, or Escape

Three effects: close when selectedCollection changes, close when
archivedDots reaches zero, close on Escape key. All three reset the
search query on close."
```

---

## Task 5: Remove The Inline Archived Strip From The Dots Card

The modal is now the single entry point; delete the old inline section.

**Files:**
- Modify: `components/HillChartApp.tsx` — remove the `archivedDots.length > 0` block inside `CardContent` (~lines 3596-3625)

- [ ] **Step 1: Delete the inline archived block**

Find and delete this entire block inside the Dots `CardContent`:

```tsx
          {archivedDots.length > 0 && (
            <>
              <div className="my-2 border-t border-border" />
              <div className="text-xs text-muted-foreground mb-1">Archived</div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {archivedDots.map((dot: Dot) => (
                  <div
                    key={dot.id}
                    className="rounded-md border border-border bg-muted/40 p-2.5 opacity-65 grayscale shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)]"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium italic text-muted-foreground">{dot.label}</p>
                      <span className="text-xs text-muted-foreground">{Math.round(dot.x)}%</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-full px-2 text-[11px]"
                      onClick={async () => {
                        await updateDot(dot.id, { archived: false })
                      }}
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                      Unarchive
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
```

The block sits between the pagination dots block (`{totalDotsPages > 1 && ( ... )}`) and `</CardContent>`. After deletion, `</CardContent>` should follow the pagination block directly.

- [ ] **Step 2: Manual verification**

Reload the dashboard. With archived dots in the current collection, scroll the Dots card. Expected: no divider, no `Archived` label, no grayed-out mini-cards inside the card. The only way to see archived dots is the `Archive (N)` button in the header, which opens the modal.

- [ ] **Step 3: Commit**

```bash
git add components/HillChartApp.tsx
git commit -m "Remove inline archived-dots strip from Dots card

The archive modal is now the sole entry point for archived dots.
Keeps the Dots card within its fixed 392px height without overflow."
```

---

## Task 6: End-To-End Manual Verification

Walk through the complete checklist from the spec in order.

- [ ] **Step 1: Run through all 11 spec test scenarios**

In the live dev server (`http://localhost:3001`):

1. Collection with active dots but no archived dots → header shows no Archive button.
2. Archive one dot via the existing dot action menu → header now shows `Archive (1)`.
3. Click `Archive (1)` → modal opens listing that one dot.
4. Archive several more dots → modal count increments; list updates live.
5. Type a partial label into the search → list filters; non-matching text shows the empty-filter message.
6. Click `Unarchive` → row disappears; dot reappears in active Dots list; header count decrements.
7. Click `Delete` → existing delete-confirm dialog appears on top; canceling leaves the row; confirming removes it.
8. Unarchive or delete the last remaining archived dot → modal auto-closes; header button disappears.
9. With modal open, switch collections → modal closes automatically.
10. Press `Escape` with modal open → modal closes.
11. Dark mode and light mode → panel, text, and buttons read cleanly in both.

- [ ] **Step 2: Lint check**

Run: `pnpm -s exec next lint components/HillChartApp.tsx`
Expected: no new warnings from files in this PR. Pre-existing warnings in the file are acceptable.

- [ ] **Step 3: Typecheck**

Run: `pnpm -s exec tsc --noEmit`
Expected: no new type errors from `components/HillChartApp.tsx`.

- [ ] **Step 4: Final commit (if any fixes were needed)**

Only commit if Steps 2 or 3 required fixes:

```bash
git add -u
git commit -m "Fix lint/type issues in archive modal"
```

If no fixes, skip this step.

---

## Self-Review

**Spec coverage check:**
- Goals → Task 1 (button), Task 2 (shell), Task 3 (list) → covered.
- Header changes (remove sort, add button, remove inline archived) → Task 1 + Task 5.
- Modal UI (overlay, panel, title, search, list, empty states, close) → Task 2 + Task 3.
- Data flow (unarchive via `updateDot`, delete via `deleteConfirm`) → Task 3.
- Edge cases (collection switch, zero archived, Escape) → Task 4.
- Testing (11 scenarios, both themes) → Task 6.
- Out-of-scope items (bulk actions, cross-collection, undo) → none added. Good.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / vague "handle edge cases". All code blocks are complete. No references to undefined identifiers — `updateDot`, `setDeleteConfirm`, `currentCollection`, `archivedDots`, `selectedCollection`, `ArchiveIcon`, `Undo2`, `Trash2`, `X`, `Input`, `Button` are all already in scope in `HillChartApp.tsx`.

**Type consistency:** State types match (`boolean`, `string`). Handler signatures match existing patterns. `Dot` shape is untouched.

No issues found.
