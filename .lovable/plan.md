## Add "Day-to-Night" format preset

Add a single new entry to `FORMATS` in `src/lib/marketingStudio.ts`, slotted into the **UGC** category alongside `day-in-life`.

### The entry

```ts
{
  id: "day-to-night",
  label: "Day to Night",
  description: "One Product, All Day",
  category: "ugc",
  image: u("photo-1506905925346-21bda4d32df4"),
  fragment:
    "Day-to-night time-lapse UGC: the product stays in frame as the world cycles around it from sunrise to night. Build 5–6 fast sequences in one continuous static or slow-dolly composition, lighting and sky shifting through the day. (1) Sunrise — soft pink/orange ambient light, dew or steam, product introduced into the scene; (2) Mid-morning — bright daylight, first real-use moment, hands enter frame casually; (3) Midday — hard direct light, peak activity around the product, quick cuts of repeated use; (4) Golden hour — warm low side-light, lens flares, slower more contemplative interaction; (5) Blue hour / dusk — cool ambient, practical lights flick on around the product; (6) Night — moody warm interior glow or neon, hero close-up of the product still in use. Keep the product locked in roughly the same spot every sequence so the eye anchors to it while the world transforms. Authentic phone-shot feel with smooth time-lapse pacing, ambient sound design transitioning from birdsong to city night."
}
```

### Where to insert

After the existing `day-in-life` UGC entry (around line 202) so all UGC presets stay grouped together before the `commercial` block.

### Nothing else changes

- No new category needed (`ugc` already exists).
- No schema, type, or picker changes — `FORMATS` is iterated as-is.
- Image uses the existing Unsplash helper `u(...)`; no asset to upload.
- `lockScene` is intentionally omitted so users can still pick a Scene.
