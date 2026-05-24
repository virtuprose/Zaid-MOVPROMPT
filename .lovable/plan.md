## What's already there

Looking at `GeneratedImageCard.tsx` and `PromptInspector.tsx`:

- **Animate** uses `hover:bg-accent hover:text-accent-foreground` (accent token = amber) → already amber on hover.
- **Redo** uses `hover:bg-primary hover:text-primary-foreground` (primary = cyan) → already cyan on hover.
- **Inspect** (`PromptInspector` trigger) also uses `hover:bg-primary hover:text-primary-foreground` → already cyan on hover.
- Tooltip labels exist for each ("Animate panel N · Kling 2.1 Master", "Regenerate panel N", "Inspect prompt · Shot N").
- `TooltipProvider` is mounted in `App.tsx`.

So the styling **is** in the code. Why the user feels nothing happened:

Every action button (Animate, Inspect, Redo, Expand, Download) has `opacity-0 group-hover:opacity-100`. They're completely invisible until you hover the panel, and only when the mouse lands directly on the small icon do you see the colored hover state — easy to miss, and on touch devices effectively dead.

## Fix

Make the icons discoverable and unmistakably colored:

1. **Always faintly visible** — replace `opacity-0 group-hover:opacity-100` with `opacity-70 group-hover:opacity-100` on the four corner-action buttons (Animate, Inspect, Redo, Download). The center Expand button stays hover-only (it's the whole image area).
2. **Stronger color identity on idle**, not just on hover — tint each button's idle background slightly with its brand color so the user can tell them apart at a glance:
   - **Animate** (top-right): `bg-accent/15 text-accent hover:bg-accent hover:text-accent-foreground` (amber).
   - **Inspect** (top-right-ish): `bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground` (cyan).
   - **Redo** (bottom-right): `bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground` (cyan) — keeps "Redo N" pill style.
   - **Download** (bottom-left): keep current emerald hover; idle stays neutral `bg-background/85`.
3. **Tooltip labels** — keep existing tooltips. Add `delayDuration={150}` on each so they actually appear quickly on hover instead of after the default delay.
4. **Touch / coarse-pointer** — wrap the four corner buttons in a class that forces `opacity-100` under `@media (pointer: coarse)` (or `pointer-coarse:opacity-100` via a small Tailwind plugin already present, or fall back to inline media-query class). This means tablets/phones see the icons permanently.

## Files

- `src/components/director/GeneratedImageCard.tsx` — the four button classNames (Animate, Expand, Download, Redo) + `delayDuration` on their Tooltips.
- `src/components/director/PromptInspector.tsx` — the Inspect trigger className + `delayDuration`.

No changes to functionality, props, or backend. Tooltip labels stay as they are today, only the visual prominence changes.