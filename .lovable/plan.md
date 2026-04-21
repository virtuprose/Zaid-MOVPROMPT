
## Remove "Auto-generate 12 hero presets" button

Remove the bulk auto-generation button from the Preset Previews admin header. Per-preset Generate buttons (on hero preset cards) remain available for one-off generation.

### What changes

**`src/components/admin/PresetPreviewsSection.tsx`**
- Remove the "Auto-generate 12 hero presets" button from the card header.
- Remove the associated bulk-generate handler/state (e.g. `bulkGenerating`, the loop that iterates `HERO_PRESET_IDS` calling the edge function).
- Keep all other header controls intact: "New Preset" button, global "X / Y uploaded" counter.
- Keep the per-card Generate action on hero presets unchanged.

### Files touched
- `src/components/admin/PresetPreviewsSection.tsx`
