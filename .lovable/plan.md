## Remove the "City or place" input from Reference image mode

The Scene picker shows the "City or place" panel in **both** `city` and `image` modes, which duplicates what the user already conveys by uploading a photo.

### Changes in `src/components/marketing/PresetPickerDialog.tsx`

1. **Line 99** — restrict the city input to city mode only:
   ```ts
   const showCityInput = hasPlaceModes && draftMode === "city";
   ```

2. **`switchMode("image")` branch (~line 117)** — also clear any leftover `place` text so it doesn't silently get sent to the AI:
   ```ts
   setDraftLocation((prev) => ({ ...(prev ?? EMPTY_LOCATION), place: "" }));
   ```
   (Symmetrically, when switching to `city`, clear `imagePath`/`imageUrl` — already done.)

3. **Line 427** — drop the `showCityInput && "mt-4"` margin tweak now that the two never coexist; LocationPanel renders cleanly on its own.

That's it — Reference image mode becomes purely image-driven (upload zone + helper text from `LocationPanel`), Real city mode keeps its text input + suggestion chips.

### Not changing
- `LocationPanel.tsx` already has no city field, so no edits there.
- The conflict-detection logic (`hasCity`) still works correctly because step 2 ensures `place` is empty whenever the user is in image mode.