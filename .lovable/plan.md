

## Enhance Library Filters — Multi-Select

**Problem:** Currently workflow type and model filters are single-select (only one at a time). Users want to combine filters, e.g. see both "Single Frame" AND "Two Frames" results, or filter by multiple models simultaneously.

### Changes

**`src/pages/Library.tsx`:**
- Change `workflowFilter` from `string | null` to `Set<string>` — toggling a chip adds/removes it from the set
- Change `modelFilter` from `string | null` to `Set<string>` — same behavior
- Update filter logic: if the set is empty, show all; if non-empty, entry must match one of the selected values (OR logic within each group, AND between groups)
- Update chip styling: active state when the value is in the set
- Update `hasActiveFilters` check: `set.size > 0`
- Update "Clear all" to reset both sets
- Add a count badge on the filter section showing how many filters are active (e.g. "3 filters")

**`src/i18n/translations/en.ts`** + **`ar.ts`:**
- Add `library.activeFilters` — "{count} filters active" / "{count} فلاتر نشطة"

### UX behavior
- Click a chip → toggle it on/off (checkmark icon appears when active)
- Multiple chips can be active simultaneously within the same group
- Workflow filters and model filters combine with AND (must match at least one workflow AND at least one model)
- Clear all button resets everything

