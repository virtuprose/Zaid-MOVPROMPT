## Goal
Merge the standalone Location chip into the Setting picker. The toolbar will show a single combined chip; users edit both scene and location from the same modal.

## Changes

### 1. `PresetPickerDialog.tsx` — accept optional Location slot
Add optional props: `locationValue?: LocationInput`, `onLocationChange?: (v) => void`. When provided, render a "Location" section above the preset grid:
- Section title "Location" + subtitle ("Where in the world the scene takes place").
- Inline city input + trending chips (Tokyo, Dubai, Paris, LA, Seoul) + "See all" reveal of regional groups (MENA / Asia / Americas / Europe / Africa).
- Compact reference-image dropzone (reuses `useBrandKit().uploadLocationImage`).
- "Clear location" link when set.

Existing scene-preset grid below, unchanged.

### 2. `LocationPopover.tsx`
Extract its inner content into a reusable `LocationPanel` component (same file or new `LocationPanel.tsx`) so `PresetPickerDialog` can embed the same UI. Keep `LocationPopover` exported for any other callers, but it will no longer be used in MarketingStudio.

### 3. `MarketingStudio.tsx`
- Remove the standalone `<LocationPopover>` chip and its divider (lines ~335–365).
- Pass `locationValue={location}` and `onLocationChange={setLocation}` to the Setting `PresetPickerDialog` (lines ~526–538).
- Update the Setting `PresetChip` value to combine: `setting?.label` + (`· ${location.place}` or `· Custom`) when location is set. Tooltip: "Scene type and location".
- Update Setting picker `subtitle` to mention both: "Pick the scene type and where in the world it unfolds."
- Keep `EMPTY_LOCATION`, `LocationInput`, brand-kit imports — still used.

### 4. No data-model changes
`location` state, prompt composition (`location: { place, hasImage }`), and brand-kit upload remain identical.

## Out of scope
- No backend changes.
- "YOUR LOCATIONS" saved customs (deferred earlier) still deferred.
- Other pickers (Format, Hook) untouched.