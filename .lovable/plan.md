

## Hide the Augment with Presets panel

Temporarily hide the **Augment with Presets** collapsible from the left column without deleting the component, so it can be re-enabled later.

### Changes

**`src/components/WorkflowPanel.tsx`**
- Comment out (or remove) the `<PresetPickerPanel />` render that currently sits below the Analyze / Skip CTA block.
- Leave the `PresetPickerPanel` import in place (commented or kept) so re-enabling later is a one-line change.

### Resulting left column order
1. Upload zone
2. Workflow tabs
3. Model picker
4. Describe Your Vision (textarea)
5. Audio toggle
6. Analyze Scene / Skip & Generate CTAs

No other files, styles, translations, or logic change. The `PresetPickerPanel.tsx` component file stays in the codebase untouched for future use.

