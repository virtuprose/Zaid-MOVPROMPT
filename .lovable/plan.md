## Fix: Model picker dropdown descriptions cut off at the right edge

### What's happening
In the model dropdown (Seedance / Veo / Kling groups), description lines like *"Best for choreographe…"* and *"Best f…"* are clipped mid-word. Two compounding causes:

1. **Radix `SelectPrimitive.ItemText` is an inline span** — it doesn't stretch to the row's full width, so the inner `flex flex-col w-full` div can't actually fill the row. Long text overflows horizontally and gets clipped by `overflow-hidden` on `SelectContent`.
2. **Tight horizontal budget** — each item has `pl-8 pr-2` (checkmark gutter) + the row's own `px-2.5` + `pr-2` on the inner div. Combined with the popover width and the inline-span issue above, descriptions don't get enough room to wrap cleanly.

### Fix

**File: `src/components/ModelPicker.tsx`**

Force the `ItemText` wrapper to behave as a block-level, full-width container so the flex column inside can wrap properly. Apply the layout styles directly to the `SelectItem`'s text slot via a child selector, and reduce the inner `pr-2` so wrapped lines have breathing room.

Specifically:
- Add `[&>span]:block [&>span]:w-full [&>span]:min-w-0` to the `SelectItem`'s `className` so Radix's internal ItemText span becomes a full-width block.
- Remove the redundant `pr-2` on the inner `<div>` (the row already has `px-2.5`); keep `min-w-0 w-full`.
- Keep `whitespace-normal break-words` on the description; remove `line-clamp-3` since the row's `min-h-[3.25rem]` is already a soft floor and we'd rather show the full sentence than truncate.
- Tighten left padding from `pl-8` to `pl-7` on the SelectItem (via override) — Radix's check icon sits at `left-2` w-3.5, so `pl-7` is enough and gives ~4px back to the text column.

### Files touched
- `src/components/ModelPicker.tsx` — only the `ModelRow` component (~10 lines).

### Verification
1. Open the model dropdown on desktop (1144px) and mobile widths.
2. Confirm long descriptions (Seedance 2.0, Seedance Pro, Kling Omni) wrap fully — no trailing "…" mid-word, no horizontal clipping.
3. Confirm the highlighted/selected row (amber bg) shows the same full text.
4. Switch to Arabic (RTL): descriptions should wrap cleanly mirrored, no overflow on the left edge.
5. Trigger label still renders; selection still works.
