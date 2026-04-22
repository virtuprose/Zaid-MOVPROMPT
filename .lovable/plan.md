

## Move presets below the Analyze Scene CTA

Move the **Augment with Presets** collapsible from its current position (right after the "Describe Your Vision" textarea) to sit **below the Analyze / Skip CTA buttons** at the bottom of the left column.

### Changes

**`src/components/WorkflowPanel.tsx`**
- Remove `<PresetPickerPanel />` from its current spot directly after `{descriptionBlock}`.
- Re-render `<PresetPickerPanel />` after the Analyze Scene / Skip & Generate CTA block in the left column.

### Resulting left column order
1. Upload zone
2. Workflow tabs
3. Model picker
4. Describe Your Vision (textarea)
5. Audio toggle
6. Analyze Scene / Skip & Generate CTAs
7. **Augment with Presets (collapsible)** ← moved here

### Right column
- Unchanged — empty state / generated prompts only.

No new files, no styling changes, no translation changes — purely a placement move.

