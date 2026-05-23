When a user detaches the last product/brand in Marketing Studio (clicking X on the product chip so `brandActiveIds` becomes empty), reset the studio configuration so they start fresh.

In `src/pages/MarketingStudio.tsx`, add a `useEffect` that watches `brandActiveIds.length`. When it transitions from >0 to 0, reset:

- `master` → `""`
- `formatId` → `undefined`
- `customFormat` → `""`
- `userNote` → `""`
- `settingId` → `undefined`
- `customSetting` → `""`
- `location` → `EMPTY_LOCATION`
- `placeMode` → `"preset"`
- `subjectOverride` → `null`
- detach all active characters via `toggleCharacterActive` (so the character chip clears too)
- close any open picker (`setOpenPicker(null)`)

Keep render settings (aspect, model, etc.) untouched — those are user preferences, not product-specific. Use a ref to track the previous count so we only reset on the >0 → 0 transition (not on initial mount when it's already 0).