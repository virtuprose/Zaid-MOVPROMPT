
## Add search + group filter to Preset Previews

Quickly locate any preset in the admin grid by typing a name/id or filtering to a single category.

### What changes

**`src/components/admin/PresetPreviewsSection.tsx`** — add a toolbar row above the grouped grid with:

1. **Search input** (debounced via local state) — matches case-insensitive against `preset.label`, `preset.id`, and `preset.description`.
2. **Group filter** — `Select` with options: *All groups*, then each entry from `PRESET_GROUPS`.
3. **Status filter** — `Select` with: *All*, *Uploaded*, *Missing video*. Useful for finding presets still needing a clip.
4. **Clear button** (X icon) — appears when any filter is active; resets all three.
5. **Result counter** — small text showing `Showing N of M presets` next to the toolbar.

### Behavior
- Filters compose (AND): search ∧ group ∧ status.
- When a group is selected, only that section renders. When *All* is selected, the existing grouped layout is kept and any group whose filtered items list is empty is hidden.
- Per-group "X / Y uploaded" counter updates to reflect the filtered subset.
- The top "X / Y uploaded" header counter stays global (not affected by filters) so the overall progress indicator remains stable.
- Bulk-generate and "New Preset" buttons stay in the header, unaffected by filters.

### Files touched
- `src/components/admin/PresetPreviewsSection.tsx`
