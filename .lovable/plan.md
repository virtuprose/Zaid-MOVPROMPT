# Move "Your brand" + "Your character" next to Generate

Today both live as full-width rows above the composer card. They take a lot of vertical space and split attention from the prompt + Generate flow. We'll collapse each into a single compact picker button, sit them side-by-side just above the Generate button inside the composer, and open a popover on click that lists saved items + a "New …" option.

## UX

- Remove the `BrandsRow` and `CharactersRow` sections above the composer.
- Inside the composer card, add a thin row directly above the Format / Hook / Setting chips that contains exactly two pill buttons, left-aligned and matching each other:
  - **Your brand** — shows brand logo + name when one is active, otherwise icon + "Add brand". A small `×` clears the active brand.
  - **Your character** — shows reference avatar + name when one is active, otherwise icon + "Add character". A small `×` clears the active character.
- Clicking either pill opens a popover anchored under the button:
  - Lists saved items (avatar/logo + name + role/subject, check mark on active).
  - Each row has hover edit/delete actions (reuse existing patterns).
  - Footer button "New brand" / "New character" opens the existing `BrandKitSheet` / `CharacterKitSheet` in create mode.
  - Empty state: short hint + the same New button.
- The detached-chip strip that currently lives at the top of the composer (lines 354–437) keeps working as-is for Location, but the brand/character chips there become redundant — remove the brand and character chips from that strip (Location chip stays). The new pills are the single place to see/edit the attached brand and character.

## Files

- `src/pages/MarketingStudio.tsx`
  - Delete the `BrandsRow` and `CharactersRow` JSX blocks above the composer (lines ~322–350).
  - Inside the composer, add a new row above the chips row containing two `<BrandPickerPopover>` / `<CharacterPickerPopover>` triggers.
  - Trim the existing detached-chip strip so it only renders for `location`.
- `src/components/marketing/BrandPickerPopover.tsx` — already exists, reuse. Confirm `onEdit`/`onDelete` callbacks fire and wire to existing `setBrandEditId` / `deleteBrand`.
- `src/components/marketing/CharacterPickerPopover.tsx` — **new**, mirror of `BrandPickerPopover` using `CharacterKit` fields (`reference_url`, `name`, `role`). Same trigger/popover structure.
- `src/components/marketing/BrandsRow.tsx` and `CharactersRow.tsx` — no longer rendered; leave files in place for now (can be removed in a follow-up) to keep the diff small.

## Visual

```text
┌─ Composer card ──────────────────────────────────────────────┐
│ [ Your brand: ◉ Acme  × ]   [ Your character: ◉ Maya  × ]    │
│                                                              │
│ Describe what happens in the ad…                             │
│                                                              │
│ [Format] [Hook] [Setting]                       [Generate ad]│
└──────────────────────────────────────────────────────────────┘
```

Both pills share the same height (h-9), rounded-xl, border + subtle background, and align on a single flex row with `gap-2`. On narrow screens they wrap but stay aligned to each other. No business-logic changes — brand/character selection state, generate flow, and kit sheets stay the same.
