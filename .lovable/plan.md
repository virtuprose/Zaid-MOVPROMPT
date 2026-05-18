# Fix composer: cramped "Describe your ad" input

## Problem

In the composer, the chips (Product, Avatar, +Add) and the **Describe your ad…** input all live on the same `flex-wrap` row. Once the user adds a second product and a second character, the chips eat up almost all the horizontal space, leaving the describe input squeezed into ~180px on the right — visible in your screenshot. It looks broken and is hard to type into.

## Fix

Restructure the composer card in `src/pages/MarketingStudio.tsx` into **three clean rows** instead of two:

```text
Row 1: [Product chips...] [+Add product]  [Avatar chips...] [+Add avatar]
Row 2: [ Describe your ad…                                              ]
Row 3: [Format] [Location] [Settings]                       [Generate ad]
```

### Specific changes (lines ~589–737)

1. **Row 1 — Chip strip only.** Keep the existing `flex flex-wrap items-center gap-2` wrapper, but remove the describe input `<div>` (lines 716–736) from it. Chips can now wrap naturally without competing for input space.

2. **Row 2 — Full-width describe input.** Insert a new row between the chip strip and the Format/Location row:
   - Full-width container with subtle inset styling (rounded, slightly recessed `bg-background/40`, hairline top border separator so it visually groups with the chip strip above).
   - Input grows to fill the row; clear-button (`X`) stays right-aligned.
   - Height bumped from `h-9` to `h-11` so it reads as the primary input.
   - Keep the same `value`, `onChange`, `maxLength={280}`, `aria-label`, placeholder.

3. **Row 3 — Unchanged.** Format / Location / RenderSettings / Generate ad button stay as-is.

4. **Spacing pass.** Adjust the `mb-2` / `mt-2` between sections to consistent `gap-3` on a parent `flex flex-col` so the three rows breathe evenly.

## Out of scope

- No logic changes (no edits to brand/character kits, hooks, or save flow).
- No changes to chip visuals, picker popovers, or the subject sidebar.
- No mobile-specific rework beyond what naturally falls out of stacking rows.

## Files touched

- `src/pages/MarketingStudio.tsx` (composer JSX only, ~lines 589–737)
