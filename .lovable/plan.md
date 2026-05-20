## Goal
Make the model picker dropdown feel minimal. Strip decorative chrome, keep the function.

## Changes — all in `src/components/ModelPicker.tsx`

### Header (lines 275-320)
1. **Remove the "Available providers" row entirely** (lines 287–297). The list is implicit once users scroll/search; the row is just noise.
2. **Remove the "Sort by:" label** (line 299). Keep the four sort chips, but restyle:
   - No pill borders / no background for inactive
   - Active = single underline + foreground color, inactive = muted-foreground hover→foreground
   - Plain text buttons with `gap-3`, no pill shape
3. **Search input**: drop the filled `bg-secondary/60 border`. Replace with a borderless variant — just the search icon + input on a transparent background, with a single bottom hairline. Removes the boxed look.
4. Reduce header padding `px-3 py-2` → `px-4 py-3` and the inner `mt-2` gaps → `mt-3` so spacing breathes.

### Rows (lines 122-193)
5. **Remove the per-row `HelpCircle` (?) button** (lines 159–181). The description already sits under each row — the tooltip is redundant. Removes the trailing icon clutter on every line.
6. Reduce row left accent from `border-l-2` to `border-l` and the `ps-5` indent to `ps-4`.
7. Tighten badge styling: keep Flagship/Lite/Fast/Recommended pills but drop their backgrounds — use bordered ghost pills (`border border-current/30 text-current`) at the same tiny size, so they read as labels not buttons. Only the active selection's primary accent stays colored.

### Group labels (lines 347-356)
8. **Drop the company subtitle** ("by google", "by kuaishou", etc.) — keep just the uppercase group name. One line per section header.
9. Make section headers non-sticky (`sticky top-0` removed) and switch to a simple `text-[10px] tracking-[0.14em] text-muted-foreground` style with a hairline above. More editorial, less heavy.

### "Any Model" row
10. Keep as-is at the top, but the Recommended pill becomes a ghost-outline pill matching #7.

## Out of scope
- No changes to sorting/filtering logic, search behavior, or data
- No changes to the trigger card, width, or popover container
- No new colors — uses existing tokens
- No new dependencies
