
# Make Scene + Location mutually exclusive with a clear 3-mode picker

## Quick note on requests #2 and #3

Today Setting + Location already live inside **one** dialog (the "Location" chip opens a picker that contains both the SETTINGS grid and the LocationPanel). Your requests are slightly in tension:

- **#2** says split them into two tiles.
- **#3** says add a 3-mode toggle inside one picker.

A 3-mode toggle inside a single tile actually solves the same problem #2 is trying to solve (making the relationship visible) without doubling the toolbar. I'm proposing we go with the **3-mode unified tile** approach (#1 + #3 + #4) and skip splitting into two chips. If you'd rather have two separate chips, say the word and I'll redesign.

## What changes

### 1. Rename the chip

`Location` chip → **`Scene`**. Still one tile in the toolbar.

The chip's value text shows the active mode:
- *"Kitchen"* (preset mode)
- *"Tokyo"* (real city mode)
- *"Reference image"* (image mode)
- *"Tokyo · Ref image"* if both real city + image (allowed — they reinforce each other)

### 2. Add a Mode toggle at the top of the picker

Inside `PresetPickerDialog` (used for the location picker), add a segmented control above the cards:

```
[ Preset scene ]  [ Real city ]  [ Reference image ]
```

- **Preset scene** → shows the SETTINGS grid (Kitchen, Rooftop, Studio…) and hides the LocationPanel. Writes to `settingId` / `customSetting`. Clears `location.place` and `location.imagePath`.
- **Real city** → hides the SETTINGS grid, shows only the city text input + suggested chips (Tokyo, Paris, Marrakech, NYC…). Writes to `location.place`. Clears `settingId` / `customSetting`. Image stays allowed but optional.
- **Reference image** → hides the SETTINGS grid, shows only the image upload zone + an optional city text input below. Writes to `location.imagePath`. Clears `settingId` / `customSetting`.

Switching modes **auto-clears** the values that don't belong to the new mode (this is request #1, generalized — Setting auto-disables whenever the user moves into Real city or Reference image mode).

### 3. Conflict warning

If the user lands in the picker with conflicting state already set (e.g. a Setting preset + a location image, from an older session or template), show an amber banner at the top of the dialog:

> ⚠️ Reference image will override the *Studio* preset. Pick one mode to keep both clean.

With a `[Use reference]` / `[Use preset]` resolver button pair. Same banner mirrored as a small amber dot on the Scene chip in the toolbar.

### 4. Initial mode selection

When the picker opens, pre-select the mode based on existing brief state:
- `location.imagePath` present → **Reference image**
- else `location.place` present → **Real city**
- else (default) → **Preset scene**

## Files touched

1. **`src/components/marketing/PresetPickerDialog.tsx`**
   - Add optional `mode` prop set: `"preset" | "city" | "image"`, with `onModeChange`.
   - Render a segmented toggle above the search/category row (only when this new prop is supplied — keeps the Format picker untouched).
   - Conditionally hide the preset grid when mode ≠ "preset".
   - Conditionally hide the `LocationPanel` based on mode (image mode → image-only; city mode → place text only).
   - Render the conflict banner when called with conflicting initial state.

2. **`src/components/marketing/LocationPanel.tsx`** (light touch)
   - Add `showPlace?: boolean` and `showImage?: boolean` props so the picker can show only the relevant half per mode.

3. **`src/pages/MarketingStudio.tsx`**
   - Rename the chip from `Location` to `Scene` (icon stays `Globe2`).
   - Track a local `placeMode` state for the picker. Derive its initial value from `settingId` / `location.place` / `location.imagePath`.
   - When the user switches mode in the picker, clear the off-mode state (`setSettingId(undefined); setCustomSetting("")` for city/image modes; `setLocation(EMPTY_LOCATION)` for preset mode).
   - Update the chip's value formatter to reflect the three modes.
   - Show a tiny amber dot on the chip when conflicting state exists.

4. **`src/lib/marketingStudio.ts`** — no schema change needed.
   `composeStudioPrompt()` already does the right thing: if Setting is empty and Location is set (place + ref), it composes a clean prompt without conflict. Auto-clearing on the UI side is enough.

## What we deliberately keep

- The data shape (`brief.settingId`, `brief.location`) is unchanged so existing templates and `CommunityGrid` references keep working.
- The Format picker is untouched.
- Custom free-text scene stays available inside the Preset mode (the `+ Custom` card).

## Open question

The community templates today carry `settingId` only (e.g. `kitchen`, `rooftop`). They'll keep working as Preset mode. If you want, we can extend templates later to also carry `location.place` so the community feed can showcase city-specific ads — but that's a separate change.
