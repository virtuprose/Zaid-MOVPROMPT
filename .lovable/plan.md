# New brand not showing after save

## Problem

`useBrandKit()` and `useCharacterKit()` each keep their own local `kits` state. `MarketingStudio` calls the hook once for the picker, and `BrandKitSheet` calls it again internally. When the sheet saves and reloads, it only refreshes the sheet's copy — the picker on the page never sees the new brand until a full page reload.

DB confirms the brand was saved (`Double Trouble Burgers` exists for the current user), so this is purely a UI refresh bug.

## Fix

In `src/pages/MarketingStudio.tsx`:

1. Pull `reload` out of `useBrandKit()` and `useCharacterKit()`.
2. Pass `onSaved={() => reload()}` (brand) and the equivalent for character to their respective sheets.
3. Also call the matching `reload` after `deleteBrand` / `deleteCharacter` so the row updates immediately.

No schema changes, no changes to the sheets themselves (they already expose `onSaved`).
