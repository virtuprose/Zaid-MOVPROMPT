
User wants the `#1`, `#2` badges on Element thumbnails replaced with `@1`, `@2` to match the mention syntax used in the description.

## Plan

In `src/components/ElementGrid.tsx`, find the badge rendering each thumbnail's index (currently `#${idx + 1}`) and change it to `@${idx + 1}`.

### Files touched
- `src/components/ElementGrid.tsx`

No i18n, backend, or styling changes needed.
