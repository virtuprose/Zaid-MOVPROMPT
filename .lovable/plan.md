## Goal

Make the 2nd preset card in the open PresetPickerDialog play the uploaded `Cinematic_AI_Director_2.mp4` as a muted autoplay loop instead of showing a still image. All other preset cards stay as images.

## Which preset?

The picker is rendered from two lists in `MarketingStudio.tsx`:
- `FORMATS.filter(f => f.category === "commercial")` — Commercial formats
- `SETTINGS` — Scene settings

Both live in `src/lib/marketingStudio.ts`. I will attach the video to the preset you actually have open. Please confirm in chat which one — e.g. "Commercial formats, 2nd card" or "Settings, 2nd card" — and I'll wire it to that exact entry. If you don't reply I'll default to the **2nd commercial format** preset (the picker most likely to feature a hero video).

## Steps

1. **Add the asset.** Copy `Cinematic_AI_Director_2.mp4` to `public/presets/cinematic-ai-director.mp4` so it's served as a static URL (`/presets/cinematic-ai-director.mp4`). Videos don't belong in `src/assets` (no bundler benefit, large file).

2. **Extend the preset type.** In `src/lib/marketingStudio.ts`, add an optional `video?: string` field to the `StudioPreset` type alongside the existing `image`.

3. **Render video when present.** In `src/components/marketing/PresetPickerDialog.tsx` around line 371, change the image branch to:
   - if `p.video` → render a `<video src={p.video} muted loop autoPlay playsInline preload="metadata" poster={p.image}>` with the same `absolute inset-0 w-full h-full object-cover` classes and group-hover scale transition
   - else if `p.image` → existing `<img>`
   - else → existing emoji fallback
   The poster falls back to `p.image` so the card still shows something instantly while the video loads.

4. **Attach the video to the chosen preset.** Set `video: "/presets/cinematic-ai-director.mp4"` on the single confirmed preset entry. Leave its `image` in place to act as the poster frame.

## Out of scope

- No changes to preset selection logic, prompt composition, or the picker's other modes (city / image).
- No autoplay-on-hover / pause-on-blur logic — every video card just loops quietly. We can add that later if multiple cards end up using video.
- No new DB columns or edge function changes.

## Files touched

- `public/presets/cinematic-ai-director.mp4` (new — copied from upload)
- `src/lib/marketingStudio.ts` (type + one preset entry)
- `src/components/marketing/PresetPickerDialog.tsx` (video branch in the card render)
