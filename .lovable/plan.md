

## Mobile ModelPicker polish

### Goal
Make picking a model effortless on a phone held in one hand.

### Changes (scope: `src/components/ModelPicker.tsx` only)

**1. Thumb-friendly trigger**
- Bump trigger min-height from `3.75rem` → `4rem` on mobile and increase tap padding: `py-3 px-3.5 sm:py-2.5`.
- Stack label + selected description vertically inside the trigger via custom render (use `SelectValue` children override pattern): show selected model name on line 1, description on line 2 (2-line clamp) for clearer at-a-glance feedback.

**2. Mobile-optimized dropdown surface**
- Replace fixed `max-h-[420px]` with `max-h-[min(70vh,420px)]` so the list always fits above the keyboard/home indicator.
- Add `w-[min(22rem,calc(100vw-1.5rem))]` so the popover never overflows viewport on 360–440px.
- Inner scroll area: `overscroll-contain` so scrolling the list doesn't bubble to the page.

**3. Bigger, clearer rows**
- `SelectItem`: `py-3 px-2.5` (up from `py-2`) and `min-h-[3.25rem]` — easier thumb targets.
- Description: keep 2-line clamp but add `text-[11px] sm:text-xs` for tighter mobile density without feeling cramped.
- Add a subtle left accent bar for the currently selected item using `data-[state=checked]:border-l-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5`.

**4. Selection feedback**
- When model changes, flash a brief `ring-2 ring-primary/40` on the trigger via a short-lived state (200 ms) so the user sees confirmation after the sheet closes.
- Make the sparkles icon `text-primary animate-pulse` briefly on change (reuse the same 200 ms state).

**5. Group headers sticky inside scroll**
- Add `sticky top-0 bg-popover/95 backdrop-blur z-10` to `SelectLabel` so category labels stay visible while scrolling the long list.

**6. Safe spacing**
- Card wrapper already `p-4 sm:p-5`; tighten inner gap to `space-y-2.5 sm:space-y-3` so the card isn't taller than needed on mobile.

### Out of scope
- Adding search/filter inside the picker.
- Changing the model list, contracts, or i18n keys.
- Desktop layout (all changes are additive / mobile-first and preserved at `sm:`).

