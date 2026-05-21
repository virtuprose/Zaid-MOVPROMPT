# Plan: Smooth, infinite rotating word column

The column in `src/components/hero/RotatingWordColumn.tsx` has two bugs visible in the hero right rail:

1. **Empty gaps at the end of the cycle.** The list translates upward as `active` increments, but there are only 9 items, so the last few ticks expose empty space below the marker before snapping back to index 0.
2. **The motion stops feeling tied to "each point."** When it wraps from item 8 → 0, it jumps backward all the way up instead of continuing forward.

## Fix

Rework `RotatingWordColumn.tsx` to a true infinite scroller:

- Render the `WORDS` array **twice** back-to-back so there's always content above and below the play marker — no more empty.
- Keep an `active` counter that only **increments forward** (never wraps). Translate by `active * ITEM_HEIGHT`.
- When `active` reaches `WORDS.length` (we've scrolled past the first copy), after the transition completes, **silently reset** to `active - WORDS.length` with the transition temporarily disabled. The duplicated copy makes the swap visually identical, so the motion looks continuous — always moving in the same direction with each tick.
- Keep the pink `Play` marker pinned at vertical center; each new word slides into alignment with it on every tick (the "moving with each point" feel).
- Keep current timing (`INTERVAL = 1800ms`, 900ms eased translate) and the top/bottom fade mask.

## File touched
- `src/components/hero/RotatingWordColumn.tsx` (only this file; no new imports beyond `useRef`)
