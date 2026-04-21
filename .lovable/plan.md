
## Expand Preset Previews to cover all presets

Right now the admin **Preset Previews** section only shows the 12 hero presets (`HERO_PRESET_IDS`). You want to upload videos for **every** preset in the app, so each one can have a hover-play clip on the main page.

### What changes

**1. `src/lib/presets.ts`**
- Replace the hard-coded `PRESETS_WITH_VIDEO` set with a derivation from all `PRESETS` (every preset becomes video-eligible).
- `HERO_PRESET_IDS` stays as-is (still used for the homepage hero row), but a new `ALL_PRESET_IDS` export is added for the admin section.
- `getPresetVideoUrl(id)` returns a URL for any preset id.

**2. `src/components/admin/PresetPreviewsSection.tsx`**
- Iterate over **all** presets instead of `HERO_PRESET_IDS`, grouped by `PRESET_GROUPS` (Basic Camera / Epic Camera / Effects / Catch the Pulse / Mix) with a group header above each grid so the long list stays scannable.
- Add a small summary line at the top: `X / Y previews uploaded`.
- Keep per-card Upload / Replace / Delete / Generate buttons exactly as they are.
- "Auto-generate all 12" button stays scoped to hero presets only (bulk generation across ~50 presets would be too slow / costly) — relabel to **"Auto-generate 12 hero presets"** and add a tooltip clarifying that non-hero presets are upload-only for now.
- The `meta` refresh still lists the `preset-previews` bucket but now keys against every preset id.

**3. `src/components/PresetCard.tsx`**
- No code change needed — it already calls `getPresetVideoUrl(preset.id)` and gracefully falls back to the icon when no video exists, so every preset will automatically pick up its video once uploaded.

### Out of scope
- No DB schema or storage bucket changes (the `preset-previews` public bucket already accepts any `<id>.mp4`).
- No change to bulk-generate behavior beyond the relabel.

### Files touched
- `src/lib/presets.ts`
- `src/components/admin/PresetPreviewsSection.tsx`
