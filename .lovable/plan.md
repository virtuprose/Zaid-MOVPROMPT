Redesign the Aspect + Duration row in the sticky generate bar using the chosen "Cinema console + readout" direction.

## What changes

In `src/components/WorkflowPanel.tsx`, the inline block inside `mobileStickyCta` that currently renders flat pill chips for aspect and duration is replaced with a single rounded console card containing three clusters:

1. **Aspect** — segmented control where each option shows a tiny rectangle scaled to its real ratio (16:9 wide, 9:16 tall, 1:1 square) above a monospace label. Active option uses the amber `accent` token with a soft glow.
2. **Duration** — a horizontal scrubber with tick marks for every available second, monospace labels above each tick, a gradient track filling from start to the active value, and a glowing amber handle dot. Each tick is clickable so exact seconds remain selectable. If the model supports it, an "Auto" pill sits at the end.
3. **Selected readout** — right-aligned mono display "16:9 / 14s" (hidden on small widths), separated by a vertical divider, with the slash in amber.

## Tokens / styling

- Uses semantic tokens only: `accent`, `border`, `muted-foreground`, `card`, `background`, `foreground`. No raw hex / no `amber-500`.
- Glow effects via `shadow-[0_0_Xpx_hsl(var(--accent)/0.X)]`.
- JetBrains-mono-style numerics via existing `font-mono`; labels via `font-display`.
- Compact: fits in the same sticky-bar slot above the Generate button, wraps cleanly on narrow widths (readout hides under `sm`).

## Out of scope

- No changes to state, persistence, or the Generate button.
- No changes outside the `mobileStickyCta` block.
- No new translation keys (labels "Aspect" / "Duration" / "Selected" / "Auto" stay English to match the existing inline copy).
