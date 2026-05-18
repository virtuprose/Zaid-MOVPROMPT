# Fix blank chip after saving a second product / character

## Symptom

When the user creates a second product (or character) and saves, a chip *does* appear in the composer, but with no thumbnail — just the placeholder icon.

## What the network shows

For the new "Fizz Cola" save, the POST to `brand_kits` was sent with `"logo_path": null` — even though the user had successfully uploaded an image to storage 26 seconds earlier (`logo-1779126906699.png`, HTTP 200). Because `logo_path` is null in the DB, `signLogo()` returns null on reload, and the chip falls back to the `<Building2>` icon.

So the chip is "there but blank" because the **uploaded image path never made it into the saved row**.

## Root cause

`BrandKitSheet` (and `CharacterKitSheet`) has this effect:

```ts
useEffect(() => {
  if (!open) return;
  if (kitId) setDraft(found ?? EMPTY_BRAND_KIT);
  else setDraft(EMPTY_BRAND_KIT);
}, [open, kitId, kits]);   // <-- `kits` is the problem
```

`kits` is the array returned by `useBrandKit()` in the parent. Any time the parent reloads brands (which happens inside `saveKit`, on auth changes, after any toggle, etc.), `kits` becomes a new reference. The effect fires while the dialog is still open with `kitId = null` and **resets the draft back to `EMPTY_BRAND_KIT`**, wiping the `logo_path` the user just uploaded — but typically *after* the user has already typed a name/description (so those text fields look fine, and only the freshly-set image fields get blown away).

The same pattern exists in `CharacterKitSheet` for the avatar `reference_path`.

## Fix

### 1. Stop resetting the draft when `kits` changes

`src/components/marketing/BrandKitSheet.tsx` and `src/components/marketing/CharacterKitSheet.tsx`:

- Drop `kits` from the effect's dependency array. Only `[open, kitId]` should reset the draft.
- For edit mode, look up the kit from `kits` once when the dialog opens (or read it lazily). Subsequent `kits` updates should not clobber in-progress edits.

### 2. Make the new chip's thumbnail appear immediately

In `src/lib/marketing/brandKit.ts` (and the equivalent in `characterKit.ts`):

- After `saveKit` inserts/updates the row, await `signLogo(saved.logo_path)` and merge the returned `logo_url` into the local `kits` state *before* the parent re-renders — currently we rely on `reload()` re-signing, which is correct, but if persisting the new selection happens via stale `activeIds` closure the second chip can briefly render before its signed URL lands.
- Compute the next `activeIds` from the value `reload()` just produced, not from the stale closure, by using the functional form of `setActiveIdsState` or by capturing the freshly-fetched selection list returned from `reload()`.

### 3. Guard against future regressions

Add a tiny console warn in `saveKit` when `payload.logo_path` is null *but* the draft had a blob `logo_url` — surfaces the "uploaded but lost" case during dev.

## Files touched

- `src/components/marketing/BrandKitSheet.tsx` — effect deps
- `src/components/marketing/CharacterKitSheet.tsx` — effect deps
- `src/lib/marketing/brandKit.ts` — selection sync after save
- `src/lib/marketing/characterKit.ts` — same

## Out of scope

- No DB migration. Existing "blank" rows (like the just-saved Fizz Cola) will still have `logo_path = null`; the user can open that brand and re-upload, and after this fix it will stick.
- No changes to the picker popover or chip strip rendering — those are correct.
