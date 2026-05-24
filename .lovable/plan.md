# Colored hover + tooltips on image-card buttons

Add proper hover colors and shadcn tooltips with labels to every overlay button on generated image cards (the buttons you see when hovering a panel: Expand, Download, Redo, Animate ▶, Inspect prompt, and Polish).

## Behavior

- On hover, each button changes to a meaningful tint instead of plain white-on-dark:
  - **Expand (⤢)** → primary cyan
  - **Download (↓)** → emerald (success-y)
  - **Redo / Polish** → primary cyan
  - **Animate (▶)** → accent amber
  - **Inspect prompt (📄)** → muted foreground (subtle)
- Each button gets a real shadcn `Tooltip` showing its name (e.g. "Download", "Expand", "Animate panel 1", "Regenerate panel 1", "Inspect prompt"), replacing the native `title=""` which is slow and ugly.
- Hover stays smooth: `transition-colors` added alongside existing `transition-opacity`.

## Files

- `src/components/director/GeneratedImageCard.tsx`
  - Import `Tooltip, TooltipTrigger, TooltipContent` from `@/components/ui/tooltip`.
  - Wrap each overlay button (Expand at L410, Download at L421, Animate at L376, Redo at L431, plus the zoomed-view Download at L630) in a `<Tooltip>`.
  - Swap `bg-background/85 hover:bg-background text-foreground` for per-action hover tokens, e.g. `hover:bg-primary hover:text-primary-foreground` etc. Keep the resting state identical so nothing flashes.
- `src/components/director/PromptInspector.tsx`
  - Same treatment on the trigger button (L92) — tooltip "Inspect prompt" + subtle muted hover.
- `App.tsx` already mounts `TooltipProvider`, no setup needed.

## Out of scope

- No color tokens added to `index.css` — using existing `primary` / `accent` / `emerald` Tailwind utilities.
- No layout/position changes; buttons stay where they are.
- Not touching `VideoBubble` overlays (ask separately if you want the same there).
