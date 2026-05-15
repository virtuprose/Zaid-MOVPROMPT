## Goal
Simplify the Location section inside the Setting modal: remove the city text input, trending chips, and regional preset groups. Keep only the reference image upload.

## Changes

### 1. `src/components/marketing/LocationPanel.tsx`
- Remove `TRENDING`, `REGIONS`, `Chip`, `query/showAll/filtered*` logic, and the Input field.
- Drop the two-column grid; render a single, wider reference-image dropzone (taller, ~180px min-height) with the existing helper text: "Drop a photo of your location. We'll match the architecture, lighting and mood in your generated ad."
- Keep header "Location" + short subtitle (updated to: "Optional — upload a reference photo of where the scene takes place.").
- Keep the "Clear" link (only shown when an image is set).
- Keep `useBrandKit().uploadLocationImage` and the `LocationInput` shape; `value.place` stays untouched (always empty from this UI now) so downstream prompt composition still works.
- Remove now-unused imports (`MapPin`, `Plus`, `useMemo`, `Input`).

### 2. `src/pages/MarketingStudio.tsx`
- Update the Setting chip label: drop the `location.place` branch (it'll never be set from UI). Show `· Custom location` suffix when `location.imagePath` is set.
- No state changes — `LocationInput` still carries `place`, just never populated.

## Out of scope
- No backend or prompt-composition changes.
- `LocationPopover.tsx` (unused after the previous merge) stays as-is.
- Brand-kit upload helper unchanged.