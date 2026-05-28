## Goal
When a user clicks the trash/delete icon next to a product in the product dropdown (BrandPickerPopover), show a confirmation dialog. Delete only happens after the user confirms.

## Changes

**`src/components/marketing/BrandPickerPopover.tsx`**
- Track which kit is pending deletion (`pendingDeleteId` state).
- Change the trash button's `onClick` to set `pendingDeleteId` instead of calling `onDelete` directly.
- Add a shadcn `AlertDialog` at the bottom of the popover:
  - Title: "Delete this product?"
  - Description: "This will permanently remove [product name] from your library. This can't be undone."
  - Cancel + destructive Confirm buttons.
  - On confirm: call `onDelete(pendingDeleteId)` then clear the state.

**`src/components/marketing/CharacterPickerPopover.tsx`** (apply the same pattern for consistency)
- Same AlertDialog wrapping the avatar delete button, with copy adjusted to "Delete this avatar?".

## Notes
- No backend, hook, or data-layer changes — `deleteBrand` / `deleteCharacter` continue to be the underlying calls.
- Uses the existing `@/components/ui/alert-dialog` component, matching the ad-delete confirmation pattern already used in `MarketingStudio.tsx`.
- Stops click propagation on the trash button so opening the dialog doesn't also select the kit.
