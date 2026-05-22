# Show only Commercial formats in the picker

Trim the "Pick the format that hits" dialog so it lists Commercial presets only and drops the UGC / Animated category tabs.

## Edit (one file)

`src/pages/MarketingStudio.tsx` — change the `<PresetPickerDialog open={openPicker === "format"} ...>` (around line 921):

1. Filter the presets passed in:
   ```tsx
   presets={FORMATS.filter((f) => f.category === "commercial")}
   ```
2. Reduce the `categories` array to just Commercial (the "All" tab is rendered by the dialog itself, so we keep one tab to label the set):
   ```tsx
   categories={[
     { id: "commercial", label: "Commercial", tooltip: "Polished brand formats" },
   ]}
   ```
3. Update the subtitle since the "unboxing to UGC" copy no longer fits:
   ```tsx
   subtitle="Polished brand formats — pick the commercial style that fits your product."
   ```

## Left as-is

- `FORMATS` in `src/lib/marketingStudio.ts` is untouched — UGC / animated presets stay in the data layer in case you want them back later, but they no longer surface in the UI.
- `BRAND_FEED` template references (e.g. `formatId: "ugc"`) keep working as data but will silently no-op in the picker selection state. If you'd like those template tiles removed too, say the word.
