Remove the duplicate Video Duration slider from the upper breakdown section so the new cinema-console scrubber in the sticky bottom bar is the single control.

## What changes

In `src/components/WorkflowPanel.tsx` (lines ~1251–1327, the block rendered inside the `breakdown`/`generate` phase when there are no results):

- Delete the multi-duration slider UI (the `Slider` with min/max/Auto pill).
- **Keep** the fixed-duration read-only label ("Xs · fixed") branch — that's the only signal for models that don't support a range and isn't shown in the sticky bar.
- Keep everything below it (Timeline prompting toggle, etc.) untouched.

Result: when a model offers a duration range, only the bottom cinema-console scrubber controls it. When a model is fixed-duration, the small "Xs · fixed" badge stays where it is.

## Out of scope

- No changes to state, persistence, model contracts, or the sticky-bar redesign.
- No copy or translation changes.
