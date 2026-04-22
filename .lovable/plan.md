

## Align Start Over + Re-analyze in one header row

Currently Start Over sits in its own row above the breakdown, and Re-analyze sits in another row below it. They're stacked with extra vertical space between them and look disconnected.

### Fix

In `src/components/WorkflowPanel.tsx` (around lines 709–750):

- Remove the standalone `startOverButton` block from the top of `rightPanel`.
- Inside the breakdown `motion.div`, replace the single right-aligned Re-analyze row with a single flex row containing **both** buttons:
  - `Start Over` on the leading edge (left in LTR, right in RTL — uses `justify-between`)
  - `Re-analyze` on the trailing edge
  - Row uses `flex items-center justify-between gap-2` so they stay on one line and align to the same baseline.
- Keep both buttons at `size="sm"` with matching height; normalize spacing so the icon + label gap is consistent (`gap-1.5`), and both buttons sit flush with the Info hint below (single `space-y-4` rhythm in the parent — no extra wrapper margins).
- When `phase === "generate"` but `sceneFrames.length === 0` (Start Over previously showed alone), keep a fallback: render just the Start Over button left-aligned in a thin row so the user can still reset.

Visual result: one tidy header row above the scene breakdown — `[Start Over]                    [Re-analyze]` — with consistent spacing, no orphan row, and proper RTL mirroring (already handled by flex + logical sides).

No translations, styles, or other components change.

