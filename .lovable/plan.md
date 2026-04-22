

## Move presets next to "Describe Your Vision"

Currently the preset motion grid (Pan, Tilt, Zoom, etc.) lives in the **right column** below the empty state / generated prompts card. You want it moved to sit **with** the "Describe Your Vision" textarea in the **left column**, so users see the description input and the preset chips together as one unified vision-building block.

### Changes

1. **`src/components/WorkflowPanel.tsx`**
   - Remove `<PresetPickerPanel />` from the right-column card container.
   - Render `<PresetPickerPanel />` in the left column, immediately after `<ConfigPanel />` (the "Describe Your Vision" block), so they appear stacked together.
   - Keep the right column focused on the empty state / generated prompts only.

2. **`src/components/PresetPickerPanel.tsx`**
   - Keep `defaultOpen={false}` so it stays collapsed by default and doesn't overwhelm the left column.
   - No structural changes — it already toggles tokens into the same `description` string used by `ConfigPanel`, so the two will stay in sync automatically.

### Resulting left column order
1. Upload zone
2. Workflow tabs
3. Model picker
4. Describe Your Vision (textarea)
5. **Augment with Presets (collapsible)** ← moved here
6. Audio toggle
7. Analyze / Skip CTAs

### Resulting right column
- Just the unified card with the empty state, or later the Generated Prompts / Scene Elements.

No new files, no translation changes, no styling changes — purely a placement move.

