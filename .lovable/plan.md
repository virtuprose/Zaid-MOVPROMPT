# Add "Continue +6 beats" button to finished storyboards

## What

When a `storyboard_panels` card finishes rendering (not in-progress, no pending failures), show an optional button next to "Regenerate all panels":

**`+ Generate 6 more beats`**

Clicking it sends a Director instruction to extend the existing sequence by 6 more panels, continuing from the last one — same scene, lighting, lens, color grade, and style lock, with shot numbering continuing from where the current storyboard ended.

## Where

**Single file:** `src/components/director/GeneratedImageCard.tsx`

In the `onRegenerate && isGrid` block (around line 260, the "Regenerate all panels" button), add a second button alongside it. Only render it when:
- `data.mode === "storyboard_panels"`
- `!inProgress`
- `(data.failedIndices?.length ?? 0) === 0` (don't offer continuation while there are still failed slots to retry)

The button calls `regen(intent)` with a prompt like:

> "Continue this storyboard — generate 6 more panels that pick up exactly where the last one ended. Keep the same scene anchor, locked style, lighting, lens, and color grade; only action and framing advance. Number the new panels starting from N+1 where N is the last existing panel."

The Director already knows how to route this to `generate_reference_image` with `mode: "storyboard_panels"` and `lock_mode: "scene"` because the scene anchor + style are already pinned in the session — same code path as "Extend frame-by-frame," just additive.

## Out of scope

- No changes to the edge function or Director agent — they already support arbitrary panel counts and scene-locked chains.
- No new state, no shot-index plumbing — the Director infers the starting number from session context.
- No copy changes to existing buttons.

## Verify

1. Generate or extend a storyboard so a finished 6-panel card is visible.
2. Confirm the new "+ Generate 6 more beats" button appears next to "Regenerate all panels."
3. Click it → Director responds and 6 new panels stream in, visually continuing the previous sequence with shot numbers 7–12.
4. While those 6 are rendering, the button should not appear on the new in-progress card (already gated by `!inProgress`).
