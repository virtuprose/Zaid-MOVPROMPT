## Goal

Finish unifying the pattern by fixing the only two row-style components in the app that still have un-docked hover actions: `BrandsRow` and `CharactersRow`. Everywhere else the pattern already applies (popover/dropdown chrome was upgraded at the primitive level last turn; Library / Director / PromptResultCard already use the unified DropdownMenu).

## Changes

### `src/components/marketing/BrandsRow.tsx` and `src/components/marketing/CharactersRow.tsx`

Each currently renders the edit + delete buttons as two separate floating squares stacked top-right. Replace with the picker pattern:

- **Floating action chip**: one rounded container (`rounded-lg border border-border/60 bg-[hsl(240_6%_9%)]/95 backdrop-blur px-0.5`) holding both icon buttons inline, absolute top-right, `opacity-0 group-hover:opacity-100`. Same visual chip as in `BrandPickerPopover`.
- **Pill thumbnail**: keep current avatar size, use `rounded-lg` (brand) and `rounded-full` (character) — already correct, no change.
- **Active state**: replace the small amber circle+check with an inline `Active` pill badge in the title row (`px-1.5 py-px rounded-full bg-[#F5A524]/15 text-[#F5A524] text-[9px] uppercase tracking-wider font-semibold`) — same treatment as the Hero badge in the picker. This stops the check from competing with the thumbnail and matches the unified language.
- Keep the outer amber border ring on active to preserve at-a-glance recognition.

### Out of scope

- No edits to the picker popovers, primitive Popover/Dropdown chrome, marketing studio, library, director, admin, learn, or any other page.
- No new components, no prop changes.

## Verification

After build, on `/marketing`: hover any product or character tile — the two action buttons appear together inside a single floating chip (no row reflow). The active tile shows an inline amber "Active" pill instead of the circle-check.