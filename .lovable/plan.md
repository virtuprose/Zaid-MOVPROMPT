## Goal

Lighten the collapsed rail. From the screenshot, the active task feels heavy (filled amber pill + bold weight + thick left bar) and uneven gaps between items make the list look noisy.

## Changes — `src/pages/Director.tsx`

### `TaskTile` (collapsed rail, ~lines 482-518)
- **Active state**: drop `bg-accent/5`, drop `font-semibold`, drop `border-l-2 border-accent`. Replace with just `text-accent` (color only) and a 1px left bar `border-l border-accent/70`.
- **Inactive**: `text-foreground/55` (slightly dimmer), keep `hover:text-foreground hover:bg-white/5`, `border-l border-transparent` (1px instead of 2px so alignment doesn't shift).
- **Typography**: bump from `text-[10px]` to `text-[11px]` for legibility, keep `leading-tight`, `font-normal` everywhere.
- **Padding**: `py-1` (was `py-1.5`) so items feel like a tight text list, `pl-2 pr-1`.

### Collapsed rail container (line ~222)
- Drop the heavy `bg-[hsl(240_6%_6%)] border border-white/5 shadow-2xl` rounded card. Make it transparent: `bg-transparent border-0 shadow-none` so the rail blends into the page (the items themselves become the list, not a card-within-a-card).
- Reduce `py-3` to `py-2`, `gap-3` to `gap-2`.
- The `New task` "+" button: drop `bg-primary/10 border border-primary/20`; use ghost style `text-muted-foreground hover:text-primary hover:bg-white/5` so the heavy amber plus square is gone.
- Drop the `w-6 h-px bg-white/5` separator — unnecessary with the lighter look.

### Item gap
- Change rail items container from `gap-1` to `gap-0` (a true text list, no gaps between rows).

## Out of scope
- Expanded sidebar (already light).
- Chat / composer / media rail.
- Tooltips (kept as-is).
