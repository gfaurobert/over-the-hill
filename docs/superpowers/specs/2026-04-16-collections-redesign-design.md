# Collections Redesign Design

## Summary

This spec defines the first implementation pass for the collections workspace redesign using the `Collections Redesign High Fidelity` frame in `DESIGN.pen` as the visual source of truth.

The goal is to ship the redesigned main authenticated workspace as one cohesive slice:

- A collapsible left collections rail
- A primary chart panel
- A snapshot panel
- A dots panel

This pass is layout-first. It should match the target structure and visual hierarchy closely while preserving current product behavior wherever possible.

## Goals

- Recreate the workspace layout shown in `Collections Redesign High Fidelity`.
- Move collection management into a left rail that becomes the primary in-page navigation surface.
- Keep the hill chart as the visual center of the experience.
- Present snapshots and dots in dedicated cards that match the new layout.
- Preserve the existing data layer, service calls, and core interactions as much as possible during the redesign.
- Allow small adjacent UX cleanup when it improves consistency inside the redesigned workspace.

## Non-Goals

- Broadly rewriting modals, settings, or authentication flows outside the main workspace.
- Redesigning backend data models, Supabase queries, or persistence rules.
- Reinterpreting the mockup as a full behavior spec for every interaction.
- Large-scale state-management refactors that are not necessary to support the new layout.
- Reworking unrelated parts of the app outside the authenticated workspace.

## Source Of Truth

The visual source of truth for this redesign is the `Collections Redesign High Fidelity` frame in `DESIGN.pen`.

Key layout cues from that frame:

- A white, elevated collections rail on the left with a header, collection items, and bottom actions
- A large chart card in the main center area
- A separate snapshot card on the right
- A full-width dots section below the chart and snapshot row
- A soft blue page background with white card surfaces, rounded corners, and subtle shadows

## Recommended Approach

Use a layout-shell-first implementation:

1. Extract the main workspace into a new composition made of focused UI panels.
2. Keep most existing state and behaviors in the parent container for the first pass.
3. Pass derived data and callbacks into subcomponents rather than duplicating business logic.

This approach is preferred because it matches the redesign quickly, reduces regression risk, and avoids making the already-large current workspace harder to maintain.

## Architecture

The first pass should keep the current services and most state ownership centralized in the main workspace container, which is currently `HillChartApp`.

The redesign should introduce a clearer render architecture with focused subcomponents:

- `CollectionsRail`
- `ChartPanel`
- `SnapshotPanel`
- `DotsPanel`

These components should be presentational and interaction-oriented, not responsible for owning independent copies of the app's business state.

The parent container should continue to coordinate:

- collection loading and selection
- snapshot loading and snapshot mode state
- dot mutation and selection state
- release line configuration
- user preference state that is already part of the existing experience

Where the current component mixes layout and state deeply, the redesign pass should add small view-model-style derived props so each panel receives a clean slice of data and callbacks.

## Component Design

### Collections Rail

The `CollectionsRail` becomes the new primary navigation surface for collections.

It should include:

- a rail header with the collections title
- a collapse or expand control
- a visible list of collections
- bottom actions including a new collection action
- a compact collapsed presentation for later support, even if the first pass keeps behavior simple

Behavior expectations for this pass:

- reuse current collection selection behavior
- reuse current create, edit, archive, and related collection actions where feasible
- preserve current rules around the special Today collection
- keep the interaction model close to the current product, only repositioned into the new rail layout

Visual expectations:

- match the card styling and spacing implied by the mockup
- make the selected collection visually distinct
- avoid reusing the current dropdown-heavy selector presentation in the main workspace

### Chart Panel

The `ChartPanel` remains the main focal area.

It should preserve:

- the current hill chart rendering
- current dot dragging behavior
- current release line rendering and configuration support
- theme-aware styling where it already exists and does not conflict with the redesign

The redesign should mostly reframe the chart in the larger card shown in the mockup rather than change its core mechanics.

### Snapshot Panel

The `SnapshotPanel` should re-present the current snapshot experience inside the dedicated right-side card shown in the design.

It should include:

- the current collection context
- snapshot month navigation
- the calendar-style snapshot view
- the existing snapshot action entry point

Behavior should remain conservative in this pass:

- keep current snapshot concepts and data flow
- preserve existing snapshot loading and selection logic
- allow small clarity improvements in labeling, disabled states, and layout

### Dots Panel

The `DotsPanel` should render the current collection's dots in the card-based layout shown in the mockup.

It should include:

- the dots section heading
- the add-dot input flow
- current dot listing grouped into card-like items
- selection affordances that stay compatible with the existing batch-edit flow

This pass should not attempt a full redesign of dot editing behavior. Existing edit, select, delete, archive, and batch flows should keep working, even if their interaction details remain closer to today's product than the mockup implies.

## Data Flow

For this first implementation pass, state should remain centralized in the parent workspace container.

Subcomponents should receive derived props such as:

- selected collection metadata
- visible collections for the rail
- chart display data and chart interaction handlers
- snapshot display state and actions
- visible dots and dots interaction handlers
- loading or empty-state flags

This keeps the redesign focused on view structure and minimizes behavioral drift.

The redesign should prefer small helper functions or derived objects over introducing new abstractions unless they are clearly needed by multiple panels.

## Error Handling

Error handling should remain conservative and behavior-preserving.

Requirements:

- existing confirmation flows must continue to work
- existing service errors should still surface through the current mechanisms unless a small in-panel improvement is straightforward
- new layout regions should expose clearer loading, empty, and disabled states where needed

Acceptable adjacent UX cleanup:

- clearer empty states inside the rail, snapshot card, or dots panel
- more obvious disabled styling for actions that are not currently available
- improved spacing or labels where the redesign would otherwise feel ambiguous

Out of scope for this pass:

- introducing new persistence rules
- changing validation rules
- redesigning every modal to match the new surface styling

## Testing Strategy

Testing should focus on regression protection for the redesigned workspace slice.

Highest-value checks:

- collections load and switch correctly from the new rail
- the chart still renders and current core interactions still work
- the snapshot card still surfaces the existing snapshot flow
- the dots panel still supports add, edit, select, and related batch flows

Preferred testing approach:

- adapt existing tests where that is cheaper than creating new ones
- add a few targeted tests around the new panel composition and major panel wiring if needed
- avoid broad low-value visual tests that only restate markup

## Delivery Boundaries

This redesign pass is successful when:

- the authenticated workspace visually reflects the high-fidelity redesign
- the main workspace is split into clearer panel-level UI boundaries
- current product behavior mostly still works inside the redesigned shell
- only limited adjacent UX cleanup is introduced

This redesign pass is not required to:

- fully modernize the internal state architecture
- make every behavior match an implied mockup interaction
- redesign unrelated flows outside the workspace

## Risks

- `HillChartApp` is already large, so careless JSX-only changes could make it harder to maintain.
- Moving collection controls into the rail may expose assumptions in the current selector logic.
- Snapshot and dots layouts may reveal places where behavior and current markup are tightly coupled.
- The current local dev setup appears to have a `tailwindcss` resolution issue, so visual verification may require fixing that separately before implementation validation.

## Implementation Guidance

- Favor extracting a few focused components over performing a broad state rewrite.
- Keep implementation simple and specific to this redesign slice.
- Reuse existing helpers, services, and behavior where possible.
- Only extract new helpers when they are genuinely reused or simplify a complex panel boundary.
- Preserve compatibility with the current authenticated app flow.

## Open Decisions Already Resolved

- Scope: full redesign slice for the main workspace
- Adjacent cleanup: small supporting UX tweaks are allowed
- Behavioral target: layout-first, with current behavior preserved where practical
- Visual source: `Collections Redesign High Fidelity` in `DESIGN.pen`
