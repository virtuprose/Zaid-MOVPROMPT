## Goal

On the Ads tool (`/marketing`):
1. **Remove the Hook chip/picker** from the composer (drop the button, drop hook from readiness, drop hook from draft + final prompt).
2. **Rename the Setting chip/picker to "Location"** so the existing scene-type + reference-image control reads as the location of the ad.

No behavior change to Format, Master prompt, brand, avatar, or render settings.

## Behavior changes

- Composer chips become: **Format · Location · Render settings**, then brand/avatar/Generate on the right.
- Readiness becomes: `(formatId || customFormat.trim()) && (settingId || customSetting.trim() || location.imagePath || location.place)`.
- `writeAdScene` call stops sending `hook`.
- `composeStudioPrompt` stops including the hook fragment.
- Summary line ("Renders as: …") drops the hook segment.
- Template auto-fills (`applyTemplate`) keep working but ignore `hookId` (still accepted in the type so existing data doesn't break — just not applied).

## Files to touch

- `src/pages/MarketingStudio.tsx`
  - Remove the `Hook` `PresetChip` (~line 674) and its `PresetPickerDialog` instance.
  - Rename the `Setting` `PresetChip` label to `"Location"` and its tooltip to something like `"Where the ad takes place — pick a scene or attach a reference image"`.
  - Update the Format chip's "Custom: …" prefix to "Master: …" if Master-prompt rename is in scope (skip if not — confirm).
  - Update `ready`, the `writeAdScene` payload, and the "Renders as" summary to drop hook.
  - Update `applyTemplate` to skip `setHookId`.
  - Update the `PresetPickerDialog` for the renamed picker: `title="Pick the location"`, `subtitle` rewritten around location, `customLabel="Custom location"`, `searchPlaceholder` updated.
- `src/lib/marketingStudio.ts` (`composeStudioPrompt`) — remove `hookId` from the signature/usage. Verify shape before editing.
- `supabase/functions/write-ad-scene/index.ts` — accept payload without `hook`; remove hook from the model brief. Verify shape before editing.

## Out of scope

- Hook presets file (`HOOKS`) stays in the codebase untouched in case we re-introduce it later.
- No DB / kit changes.
- Master-prompt rename is a separate request — not included here.

## Verification

- `/marketing` composer shows only **Format · Location · Render settings** chips.
- Picking a Format + a Location (preset or custom or reference image) enables Generate.
- Auto-drafted scene and final prompt contain no hook phrasing.
- "Renders as" summary reads `Format · Location · 9:16 · 5s · 1080p · audio on`.
- Clicking a template card still fills Format + Location without errors.
