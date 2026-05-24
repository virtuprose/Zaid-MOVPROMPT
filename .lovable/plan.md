## Goal
When the user clicks **Clear** in the Brand kit sheet (`BrandIdentitySheet`), fully turn the brand kit off — not just wipe the identity row, but also deselect any active brand kits so nothing brand-related feeds into the next generation.

## Today's behavior
- `BrandIdentitySheet` footer has a **Clear** button (line 567–575) that calls `clear()` from `useBrandIdentity`, which deletes the `brand_identities` row.
- Active brand kits selected via `useBrandKit` (`brand_kit_selections`) stay selected — so brands keep getting injected into prompts even though the user expected a clean slate.

## Change
In `src/components/marketing/BrandIdentitySheet.tsx`:
1. Also pull `setActiveIds` from `useBrandKit()`.
2. In the Clear button's onClick, after `await clear()`, call `await setActiveIds([])` to deselect every active brand.
3. Keep the existing toast + sheet close.

No backend, schema, or other UI changes. Generation logic already keys off `activeKits` + `hasBrandIdentity`, so emptying both makes the brand kit effectively off.