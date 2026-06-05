## Goal

Remove the logo feature from the Brand Kit entirely. Users will add their real logo in their own editor (CapCut, Premiere, Canva, etc.) for perfect fidelity. Brand Kit becomes **Colors only**.

## Why

The video model re-draws any logo we pass in, which mangles text and detail. Rather than ship a flaky overlay system, we get out of the way and let users composite the real logo themselves after download.

## Changes

### `src/components/marketing/BrandIdentitySheet.tsx`
- Delete the entire **Logo** block (file input, preview tile, signed-URL fetch, upload handler, remove-logo button).
- Remove `logo_path` from local form state and from the save payload (write `null` once on save so any previously uploaded path is cleared).
- Sheet now contains only the **Colors** section (Auto from product / Custom) we just shipped.
- Tighten the helper copy at the top so it doesn't mention logos.

### `src/lib/marketing/brandIdentity.ts`
- Remove `logo_path` from the `hasBrandIdentity` check — Brand Kit is now considered "set" only when colors exist.
- Drop any logo-related helpers/exports if no longer used.

### `src/lib/marketingStudio.ts`
- In `brandIdentityLine` / `composeMaster`, stop emitting any "logo on packaging / lower-third logo" instructions. No logo reference goes to the model.

### `supabase/functions/write-ad-scene/index.ts`
- Mirror the same removal — strip any logo prompt fragments and stop reading `logo_path` from the payload.

### Database & storage
- **No migration.** Leave the `logo_path` column on `brand_identities` in place (harmless, simplifies rollback).
- **No storage cleanup.** Existing files in `director-uploads/marketing/{userId}/identity/` stay; they just stop being referenced.

## Out of scope

- Colors flow (Auto / Custom) stays exactly as-is.
- No changes to product images, character kit, or any other Marketing Studio section.
- No post-render overlay tooling — users handle logo placement in their own editor.
