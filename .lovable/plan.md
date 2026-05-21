## What's broken
Light mode flips the CSS tokens, but ~226 places in the app use hard-coded color literals (`bg-[#161618]`, `bg-[hsl(240_5%_10%)]`, `bg-white/[0.04]`, `border-[#27272A]`, `text-[#71717A]`, `bg-[#F5A524]`, etc.). In light mode these stay dark, so the UI shows dark patches floating on a white background — borders disappear, hover states turn into dark blobs, sidebar pills go invisible, white-alpha surfaces vanish.

The fix is not a redesign; it's swapping literals for the semantic tokens that already flip correctly.

## Token replacement map

Applied consistently across the affected files:

| Literal | Replacement |
|---|---|
| `bg-[hsl(240_5%_9%)]`, `bg-[hsl(240_5%_10%)]`, `bg-[hsl(240_5%_11%)]`, `bg-[hsl(240_5%_12%)]`, `bg-[#161618]` | `bg-muted` (or `bg-secondary` for slightly stronger surfaces) |
| `bg-[#1a1410]` (warm amber tint) | `bg-accent/10` |
| `bg-white/[0.02]`, `bg-white/[0.04]`, `bg-white/[0.06]`, `bg-white/[0.08]` | `bg-muted/40` / `bg-muted/60` / `bg-muted` |
| `border-[#27272A]`, `border-[#3F3F46]`, `border-white/[0.06]`, `border-white/[0.08]`, `border-white/10` | `border-border` (or `border-border/60`) |
| `text-[#71717A]`, `text-[#A1A1AA]` | `text-muted-foreground` |
| `bg-[#F5A524]` + `text-[#0A0A0B]` | `bg-accent` + `text-accent-foreground` |
| `hover:bg-[#F5A524]/10` | `hover:bg-accent/10` |
| `text-white` (on amber/accent surfaces) | `text-accent-foreground` (kept as-is where layered over images/video) |

## Files to fix (highest-traffic, Director route + global nav)

1. **`src/components/TopNav.tsx`** — search pill, dropdown items, separators, mobile button (10 spots).
2. **`src/components/WorkflowPanel.tsx`** — segmented tabs, "ghost" empty buttons, chips, info banners (≈20 spots). This is the most visible light-mode failure.
3. **`src/components/ResultsPanel.tsx`** — collapsible headers, callout (3 spots).
4. **`src/components/SceneBreakdown.tsx`** — selected-shot card chrome (1 spot).
5. **`src/components/ModelPicker.tsx`** — highlighted/hover row (2 spots).
6. **`src/components/NotificationBell.tsx`** — pill toggles, icon buttons, empty avatar (5 spots).
7. **`src/components/EmptyStateExamples.tsx`** — hover surface (1 spot).
8. **`src/components/AnalyzingSkeleton.tsx`** — card border (1 spot).
9. **`src/components/ImageUploadZone.tsx`** — close button needs visible bg in light mode: add `bg-foreground/70 text-background` instead of bare `text-white`.

That covers everything reachable from `/director`. Other pages (Library, Docs, Account, Learn) use the literal classes far less and will be cleaned in the same pass only where I notice obvious breakage during a final preview check.

## After applying
- Reload `/director` in both themes; verify: dropdown surfaces match background, tab pill amber stays amber on both, no dark rectangles on white, dashed-border ghost buttons visible on white, results panel chips readable.
- Cinematic hero stays dark by design (per existing memory) — not in scope.
- No new tokens added; only swapping literals for existing semantic tokens already defined in `index.css`.