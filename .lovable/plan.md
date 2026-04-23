

## Fix ModelPicker dropdown text clipping

**Problem (visible in your screenshot):** Inside the open Model picker, long descriptions get cut mid-word ("choreographe…", "Best f…"). Two things cause it together:

1. The `SelectItem` row uses Radix's default item layout, which renders the children inside a flex row with an indicator slot. Our inner `<div>` has `w-full` but the parent flex item has no `min-w-0`, so the text container ends up overflowing its column instead of wrapping. The `line-clamp-2` then truncates the visible part horizontally as well as vertically.
2. The popover width `w-[min(22rem,calc(100vw-1.5rem))]` is fine on phones, but on the user's 1144px viewport it stays a hard 22rem (352px) even though there's plenty of room — so descriptions like the Seedance 2.0 one only get ~2 short lines and clip.

### Changes (single file: `src/components/ModelPicker.tsx`)

**1. Make item text actually wrap to the available width**
- Add `pr-2` and `w-full min-w-0` to the inner column wrapper, and add `block w-full` to both `<span>`s so they take the full row width before clamping.
- Replace the description's `line-clamp-2` with `whitespace-normal break-words` plus `line-clamp-3` so long sentences wrap onto a third line instead of being cut. Keep `truncate` only on the bold label (single line is fine for names).
- Add `data-[highlighted]:[&_*]:text-inherit` so highlighted (amber) row keeps the description readable instead of staying muted-blue on amber.

**2. Give the popover room to breathe on tablet/desktop**
- Change `w-[min(22rem,calc(100vw-1.5rem))]` to `w-[min(28rem,calc(100vw-1.5rem))] sm:w-[28rem]` so on ≥640px the panel is 448px wide — enough to render the longest Seedance/Kling description on two lines without clipping. Mobile behavior unchanged (still capped by viewport minus gutter).
- Add `side="bottom"` and `align="start"` props on `SelectContent`, plus `collisionPadding={12}` so when Radix flips it upward (drop-up), it still respects the wider width and doesn't get pinned against the right edge of the trigger.

**3. Sticky group label readability**
- The "BYTEDANCE (SEEDANCE)" sticky header currently overlaps the first row's top text on scroll. Add `shadow-[0_1px_0_hsl(var(--border))]` and bump padding to `py-2` so it sits cleanly above content.

### Out of scope

- No changes to `MODEL_GROUPS`, translations, or contract logic.
- No restyle of colors, fonts, or the trigger card itself.
- No new dependencies.

### Verification after implementation

Re-open the picker at 360, 414, 820, 1144, and 1280 widths in both LTR and RTL; confirm every Kling/Seedance/Veo description renders fully (≤3 lines, no mid-word ellipsis), the highlighted row stays readable, and the panel doesn't overflow the viewport on mobile.

