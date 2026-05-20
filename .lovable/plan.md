## Goal
Turn the 4 Features cards into a **swipeable deck** with **cursor tilt** on the top card.

## Behavior
- The 4 cards stack centered (top card fully visible, cards behind peek with slight offset, scale, and reduced opacity — 3-deep visual stack).
- Top card is draggable. Drag horizontally past a threshold (~120px) → it flies off in that direction, the next card rises to the top. Releasing before threshold springs it back.
- Buttons below the deck: **Prev / Next** arrows + dot indicators (1 of 4). Click/tap also advances. Wraps around so the deck never empties.
- Top card tilts toward the cursor on hover (subtle 3D parallax: ±6° rotateX/rotateY based on pointer position). Tilt disables during active drag and on touch.
- Cards behind the top one don't accept pointer events (no accidental hover on stacked cards).
- Drag rotates the card slightly with motion direction (rotateZ tied to x offset) for tactile feel.
- Section heading + subhead and `#how` anchor stay where they are.

## Accessibility
- `useReducedMotion()`: skip tilt and the fly-off animation; arrows/dots still work, cards swap instantly.
- Prev/Next buttons are real `<button>` with aria-labels.
- Keyboard: when the deck is focused, Left/Right arrow keys advance.

## Implementation — `src/pages/Landing.tsx`
1. Replace the grid in `Features()` with a new `FeatureDeck` component.
2. `FeatureDeck` state: `order: number[]` (rotation of indices 0..3); helpers `next()` and `prev()`.
3. Render `FEATURES.map((_, i) => …)` but position each by its slot in `order` — index 0 is top.
4. Top card wrapped in `motion.div` with `drag="x"`, `dragConstraints={{ left: 0, right: 0 }}`, `onDragEnd` checks `info.offset.x` and calls `next()`/`prev()` with fly-off `animate` to ±400px before resetting.
5. Tilt: a small `useTilt(ref)` hook attaches `pointermove` listener on the top card, drives `motionValue` rotateX/rotateY via `useSpring`. Resets on `pointerleave`. Disabled while dragging or on coarse pointers (`matchMedia('(pointer: coarse)')`).
6. Stacked card visuals: `style={{ scale: 1 - depth*0.04, y: depth*12, opacity: 1 - depth*0.25, zIndex: 10 - depth }}`. Only render the first 3 in the visual stack; the 4th sits behind invisibly until rotated up.
7. Controls row: `< 1·2·3·4 >` centered below the deck, amber active dot.
8. Cards keep their existing classNames (border, padding, hover shadow). Remove the grid hover-translate since drag/tilt handles motion.
9. Add `cursor-grab` / `active:cursor-grabbing` on the top card.

## Out of scope
- No copy changes, no data changes, no other sections touched.
- No new dependencies (uses existing `framer-motion`).
- Mobile carousel/scrubber, free-drag, reorder persistence — not building.
