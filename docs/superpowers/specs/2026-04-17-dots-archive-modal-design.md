# Dots Archive Modal Design

## Summary

Fix an oversight in the Dots card: with the card's new fixed height (`lg:h-[392px]`), archived dots can no longer be browsed properly inline. Replace the obsolete manual-sort button in the Dots card header with an `Archive (N)` button that opens a modal listing all archived dots for the currently selected collection, with search, unarchive, and delete actions.

## Goals

- Give users a dedicated surface to find and act on archived dots without bloating the fixed-height Dots card.
- Preserve the existing unarchive and delete behaviors exactly (same services, same confirmation flow).
- Remove redundant UI (manual-sort button, inline archived strip) now that dots are auto-sorted and a dedicated archive view exists.
- Stay consistent with the codebase's existing modal pattern (manual `fixed inset-0` overlay, not shadcn `Dialog`).

## Non-Goals

- No cross-collection archive browsing. Scope is strictly the currently selected collection.
- No bulk actions in the modal (no "unarchive all", no multi-select).
- No undo toast after delete (existing delete flow has none).
- No new shadcn component installation. Follow the existing inline-modal pattern used by `deleteConfirm`, `archiveConfirm`, etc.
- No backend, schema, or service changes. Everything reuses existing `updateDot` and `deleteDot` paths via `setDeleteConfirm`.

## Architecture

All changes are local to `components/HillChartApp.tsx`. No new files, no new components. The scale does not justify extraction; the modal is thin UI glue over already-tested data paths.

State additions in `HillChartApp`:

- `showArchiveModal: boolean` — controls modal visibility.
- `archiveSearchQuery: string` — client-side filter string for the archived list.

All other data (`currentCollection`, `archivedDots`, `updateDot`, `deleteConfirm`, `confirmDelete`) already exists and is reused as-is.

## Changes To The Dots Card Header

1. **Remove the manual-sort button** (the `ArrowUpDown` ghost button at lines ~3244-3262). It is obsolete because `activeDots` and `archivedDots` are already sorted by `x` descending on every render.
2. **Replace it** with an `Archive (N)` button in the same header slot:
    - Ghost variant, small size, matches current header button sizing.
    - Uses `ArchiveIcon` (already imported) plus the count `N = archivedDots.length`.
    - Rendered only when `archivedDots.length > 0`.
    - `onClick` sets `showArchiveModal = true`.
3. **Remove the inline archived section** in `CardContent` (the `my-2 border-t border-border` divider and the `archivedDots.map(...)` grid block, roughly lines ~3596-3625). The modal becomes the only way to view and act on archived dots.

## Modal UI

Compact searchable list, following the existing modal pattern.

Structure:

- Overlay: `fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50`.
- Panel: `bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-lg w-full mx-4`.
- Header row: title `Archived Dots — {currentCollection.name}` on the left, close button (`X` icon) on the right.
- Search `Input`: `placeholder="Search archived dots..."`, `maxLength={64}`, `autoFocus`, margin below.
- Scrollable list container: `max-h-[60vh] overflow-y-auto` with small gap between rows.
- Each row:
    - Colored swatch (`h-2.5 w-2.5 rounded-full` using `dot.color`)
    - Truncated label (`text-xs font-medium`)
    - `Math.round(dot.x)%` in muted text
    - `Unarchive` button (outline, small) → calls `updateDot(dot.id, { archived: false })`
    - `Delete` button (outline destructive, small) → calls `setDeleteConfirm({ dotId: dot.id, dotLabel: dot.label })`
- Footer: `Close` button on the right closes the modal.

Empty states:

- If filter yields zero rows: `No archived dots match "<query>".` in muted text, centered.
- If `archivedDots.length === 0` while the modal is somehow open (defensive): auto-close via effect.

Filtering:

- Client-side: `dot.label.toLowerCase().includes(archiveSearchQuery.trim().toLowerCase())`.
- No debouncing — list is small and fully in-memory.

## Data Flow

- The source of the list is the already-computed `archivedDots` array (`currentCollection.dots.filter(d => d.archived).sort((a, b) => b.x - a.x)`).
- **Unarchive**: reuses `updateDot(dot.id, { archived: false })`. Row disappears on next render. If `archivedDots.length` becomes `0`, the modal auto-closes (effect).
- **Delete**: reuses the existing `deleteConfirm` state. Clicking `Delete` in the modal sets `deleteConfirm`; the existing confirm dialog appears on top (higher stacking context is fine — both use `z-50` but the delete modal is rendered after the archive modal, so it paints on top). On confirm, `confirmDelete` runs the existing delete path. The archive modal stays open behind the confirm dialog and refreshes once the deletion settles.

## Edge Cases

- **`currentCollection` is null**: the header button is hidden because `archivedDots.length === 0` in that case. Defensive check in the modal body as well.
- **Collection switch while modal is open**: add a `useEffect` keyed on `selectedCollection` that sets `showArchiveModal` to `false`. The archived set belongs to the previously viewed collection; closing is the safest behavior.
- **All archived dots removed (unarchive or delete) while modal is open**: `useEffect` keyed on `archivedDots.length` closes the modal when it reaches `0`.
- **Escape key**: wire a keydown handler while the modal is open to close it, for parity with typical modal UX.
- **Unarchive / delete failure**: the underlying services already handle optimistic rollback and error logging. No new handling added.

## Testing

Manual verification against the live dashboard (dev server on `:3001`):

1. With a collection that has active dots but no archived dots → header shows no Archive button.
2. Archive one dot via the existing dot action menu → header now shows `Archive (1)`.
3. Click `Archive (1)` → modal opens listing that one dot.
4. Archive several more dots → modal count increments; list updates live.
5. Type a partial label into the search input → list filters; non-matching text shows the empty-filter message.
6. Click `Unarchive` on a row → row disappears; the dot reappears in the active Dots list. Count in the header button decrements.
7. Click `Delete` on a row → existing delete-confirm dialog appears on top; canceling leaves the row in place; confirming removes it from the archive modal.
8. Unarchive or delete the last remaining archived dot → modal auto-closes; header button disappears.
9. With the modal open, switch to a different collection via the left rail → modal closes automatically.
10. Press `Escape` with the modal open → modal closes.
11. Dark mode and light mode → panel background, text, and buttons read cleanly in both.

No new automated tests are proposed. All new behavior is thin UI glue over the already-tested `updateDot` service and the existing `deleteConfirm` flow.

## Out Of Scope

- Cross-collection archive view.
- Bulk "unarchive all" / "delete all" actions.
- Undo toasts.
- Restoring archived dots to a different collection.
- Keyboard shortcuts beyond `Escape` to close.
