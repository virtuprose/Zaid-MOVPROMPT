## Goal

Make saved brands immediately visible and selectable on `/marketing` via a "Your brands" row above the composer. Remove the hidden Brand picker popover.

## New "Your brands" row

Placed between the page heading and the composer card (`MarketingStudio.tsx`, just before `composerRef`):

- Section header: small uppercase label "YOUR BRANDS" with a count chip on the right (e.g. "3 saved").
- Horizontal scroll row of brand cards (`flex gap-3 overflow-x-auto pb-1`).
- Each brand card (~140px wide, ~96px tall):
  - Logo thumbnail (48×48 rounded) + brand name + subject tag (Product / App).
  - Hover: subtle amber border. Active: amber border + amber check badge top-right.
  - Click anywhere on the card → `setBrandActive(id)`.
  - Small ⋯ menu (or hover-only Pencil + Trash icons in the corner) for Edit / Delete.
- Trailing "+ New brand" tile (dashed border, same dimensions, amber on hover) → opens BrandKitSheet in create mode.
- Empty state (no kits saved): single full-width tile "Add your first brand — we'll reuse the logo, tagline & description on every ad" with a primary "+ New brand" button.

New small component: `src/components/marketing/BrandsRow.tsx` that wraps the card list and the new/edit/delete callbacks. It reuses the existing `useBrandKit` data passed in as props (kits, activeId, handlers).

## Composer cleanup

In the composer card's filter row (`MarketingStudio.tsx` lines ~262-296):
- Remove the `BrandPickerPopover` and its trigger button entirely.
- Keep the active brand visible in the composer as a tiny non-interactive chip (logo + "Brand: Name") so users know what's selected while typing — clicking it scrolls to the BrandsRow. If no brand is active, hide the chip.

The `BrandPickerPopover.tsx` file stays in the codebase (not deleted) in case it's referenced elsewhere, but is no longer rendered in the marketing page.

## State / data

- No backend or schema changes. Reuses `useBrandKit()` (kits, activeId, setActive, deleteKit) and the existing `BrandKitSheet` for create/edit.
- `setActive` already persists to `brand_kit_selection`, so selection survives reloads.

## Out of scope

- BrandKitSheet form layout (already polished).
- Brand kit data model.
- Other marketing-page sections (location picker, format picker, etc.).

## Files

- New: `src/components/marketing/BrandsRow.tsx`
- Edit: `src/pages/MarketingStudio.tsx` (insert BrandsRow, remove BrandPickerPopover usage, replace with passive selected-brand chip)
