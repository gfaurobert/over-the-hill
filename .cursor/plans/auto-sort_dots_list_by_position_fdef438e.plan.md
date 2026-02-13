---
name: Auto-sort dots list by position
overview: Make the Dots list always reflect position on the line by deriving its order from each dot's `x` value, so moving a dot on the chart automatically updates the list order without clicking the sort button.
todos: []
isProject: false
---

# Auto-sort Dots list by position on the line

## Current behavior

- **Dots list** ([HillChartApp.tsx](components/HillChartApp.tsx) ~2469–2481): Renders `activeDots`, which is `(currentCollection?.dots || []).filter(dot => !dot.archived)` — i.e. the **array order** of `collection.dots`.
- **Sort button** (same file ~2431–2450): On click, replaces the current collection’s `dots` with a copy sorted by `x` descending: `[...collection.dots].sort((a, b) => b.x - a.x)`. So the list only reflects line position after a manual sort.
- **Drag** (~647–655): On mouseup, `updateDot(draggingDot.id, { x, y })` updates the dot in place via `c.dots.map(...)`; **array order is unchanged**, so the list does not reorder after a move.

So list order is “whatever order the dots are in” in state; the sort button is the only way to align that order with position.

## Desired behavior

- List order should **always** match position on the line (higher `x` = further right = higher in the list, i.e. sort by `x` descending).
- Moving a dot on the line should **automatically** change the list order (e.g. move B in front of A → list shows B, A, C, D) without clicking the sort button.

## Approach: derive list order from position

Keep a single source of truth (dot positions). Derive the **display** order of the list from each dot’s `x` instead of from the stored array order.

1. **Derive `activeDots` (and optionally `archivedDots`) by position**
  In [HillChartApp.tsx](components/HillChartApp.tsx) (~1609–1611), change:
  - From: `(currentCollection?.dots || []).filter(dot => !dot.archived)` (and same for archived).
  - To: same filter, then **sort by `x` descending**: `.sort((a, b) => b.x - a.x)` so that “right on the line” = “top of the list”.
   Then the list always reflects line position. When the user moves a dot, `updateDot` only changes that dot’s `x`/`y`; on the next render, `activeDots` is recomputed and the list order updates automatically.
2. **Sort button**
  - **Option A (recommended):** Keep the button but make it redundant for display — the list is already derived by position. You can leave the onClick as-is (it re-sorts the stored `collection.dots` array) so that stored order stays in sync with position if anything else ever depends on it, or simplify the handler to a no-op.
  - **Option B:** Remove the sort button and its handler, since the list is always sorted by position.

No new state or effects are required; no changes to drag/updateDot logic. Only the definition of `activeDots` (and optionally `archivedDots`) and the sort button’s role need to change.

## Files to change

- [components/HillChartApp.tsx](components/HillChartApp.tsx):
  - **~1610–1611:** Define `activeDots` as filtered then `.sort((a, b) => b.x - a.x)`. Optionally do the same for `archivedDots` so the archived section is also ordered by position.
  - **~2431–2450:** Either keep the sort button and its current `setCollections` sort (for array sync) or remove the button and handler (Option B).

## Summary


| Item             | Change                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `activeDots`     | Derive as filtered + sorted by `x` desc so list order = line position. |
| `archivedDots`   | Optional: same sort for consistency.                                   |
| Sort button      | Keep (and optionally leave as-is for array sync) or remove.            |
| Drag / updateDot | No change; list updates automatically because it’s derived from `x`.   |


