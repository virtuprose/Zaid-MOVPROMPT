## Goal

In the "Pick the format that hits" picker, every card shows a stale cover image from the backend behind the (hover-only) video. Make video-having presets show only the video — no image cover, no poster fallback.

## Change (single file: `src/components/marketing/PresetPickerDialog.tsx`, lines 458–486)

1. **When `p.video` exists:**
   - Don't render the `<img>` cover at all.
   - Don't set `poster={p.image}` on the `<video>`.
   - Autoplay the video unconditionally (drop the `shouldPlay` gate) so cards aren't blank when not hovered. Keep `muted`, `loop`, `playsInline`, `preload="metadata"` so first-frame paints without heavy bandwidth.

2. **When `p.video` is missing (e.g., scene presets that only have an image):**
   - Keep current behavior — render the `<img>` cover as today.

3. Keep the emoji fallback for presets with neither video nor image.

## Out of scope

- No data/backend changes — `p.image` still flows in from FORMATS/SETTINGS, we just stop rendering it for video-backed cards.
- No change to the scene picker visuals (those presets typically lack `video`).