# Better Touch Support for Drag Interactions

Improve mobile drag-and-drop feel across the two main draggable surfaces — `ElementGrid` (character/reference tiles) and `LocationPickerCard` (story locations) — by tuning long-press + movement thresholds and adding visual snap feedback so swipes register predictably on touch devices.

## Scope

Touch interaction only. No business logic, no layout/visual redesign beyond drag affordances.

Files touched:
- `src/components/ElementGrid.tsx` — already has touch long-press logic; tune it and add snap.
- `src/components/director/LocationPickerCard.tsx` — currently desktop-only HTML5 drag; add equivalent touch support with the same tuned thresholds.
- `src/lib/touchDrag.ts` *(new)* — small shared helper exporting tuned constants and a `findDropTargetFromPoint` utility so both components stay in sync.

## What changes

### 1. Tuned thresholds (shared)

Centralize in `src/lib/touchDrag.ts`:

- `LONG_PRESS_MS = 180` (down from 250) — quicker to enter drag mode.
- `MOVE_CANCEL_PX = 10` (was 8) — slightly more tolerant of finger jitter before treating the gesture as scroll.
- `SNAP_DISTANCE_PX = 24` — within this distance of a tile center, snap the drag indicator to that tile.
- `HAPTIC_MS = 12` — short tap on enter-drag and on snap.

### 2. Snap behavior

While dragging on touch:

- On every `touchmove`, compute the nearest drop target via `document.elementsFromPoint`, then check distance from the touch point to that tile's bounding-box center.
- If within `SNAP_DISTANCE_PX`, mark it as the "snapped" target (sets `dragOverId`) and fire a one-shot haptic when the snapped target changes.
- If outside snap distance, fall back to the element directly under the touch (current behavior).
- Add a subtle scale/ring style on the snapped tile (reuse existing `ring-2 ring-primary/50`) so the user sees the snap commit before lifting.

### 3. ElementGrid changes

- Replace inline `250`/`8` literals with the shared constants.
- Wire snap logic into `onTouchMove`.
- Keep existing `touch-action: none` only while a drag is active (already correct) so vertical scroll is preserved before long-press fires.

### 4. LocationPickerCard changes

- Add `onTouchStart`/`Move`/`End` handlers to the location grid buttons mirroring ElementGrid's pattern.
- Long-press picks up the location; drag indicator snaps to the drop slot at the top of the card.
- On release inside the slot (or snapped to it) → call `onChoose(loc.index)`.
- Disable touch drag when `disabled` prop is true.

## Technical notes

- No new dependencies.
- Shared helper is plain TS, no React, easy to unit test later.
- Desktop HTML5 drag-and-drop paths are untouched; only the touch branch is modified.
- Haptics guarded by `'vibrate' in navigator` (already the pattern in ElementGrid).

## Out of scope

- Replacing the custom drag system with a library (dnd-kit, etc.).
- Reordering animations / FLIP transitions.
- Pointer Events unification — keeping the mouse/touch split since current code relies on it.
