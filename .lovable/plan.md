## Issue

In the format picker dialog, active and hovered preset tiles use `scale-[1.02]`. The grid lives inside an `overflow-y-auto` scroll container, so the scaled-up tile's top edge (and its amber ring shadow) gets clipped by the scroll viewport whenever a tile in the top row is active or hovered — visible as the chopped-off top corner in the screenshot.

## Fix

In `src/components/marketing/PresetPickerDialog.tsx`, remove the `scale-[1.02]` transform from both the preset tile button and the custom-scene card. Keep the visual emphasis via the existing amber border + ring shadow + slight shadow lift — no layout shift, no clipping.

Specifically:

- Preset tile (active and hover): drop `hover:scale-[1.02]` and `scale-[1.02]` on the active branch; keep `hover:border-[#F5A524]/60`, `hover:shadow-[0_0_0_3px_hsl(35_90%_55%/0.15)]`, and the active ring/shadow.
- Custom card: drop `hover:scale-[1.02]`; keep border and bg hover states.

## Out of scope

- No changes to grid layout, dialog padding, or other tile content (label, hover "Click to use" pill, check badge, broken-image fallback we just added).
- No changes elsewhere in the app.

## Verification

Open `/marketing`, launch the format picker, hover and select tiles in the top row — neither the corners nor the amber ring should clip.