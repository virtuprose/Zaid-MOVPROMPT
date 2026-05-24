## Goal
Add a new **"Elite"** format preset to the Ads / Marketing Studio format picker that bakes in the user's 10-sequence, $1M-production phantom-camera prompt and targets a 15-second render.

## Changes

### 1. New preset in `src/lib/marketingStudio.ts`
Add to the `FORMATS` array (commercial category, `lockScene: true`):

```ts
{
  id: "elite-10seq",
  label: "Elite",
  description: "10-Sequence Phantom Reveal",
  category: "commercial",
  image: u("photo-1542291026-7eec264c27ff"),
  fragment: "<full 10-sequence directive, lightly normalized to a single paragraph so the composer doesn't break it>",
  lockScene: true,
}
```

The fragment will preserve the exact directive the user provided:
- Style directive line (8k, phantom 1000fps, dark monochromatic backdrop)
- Subject placeholder driven by the user's product/image
- All 10 sequences in order, each with its label and adaptive ingredient/color cues
- Final hard requirement: **"15-second total runtime, exactly 10 sequences, ending on The Ultimate Reveal"**

### 2. Auto-set 15s when Elite is picked — `src/pages/MarketingStudio.tsx`
In the `useEffect` that already reacts to `format` changes (the `sceneLocked` block around line 295), add a sibling effect: when `formatId === "elite-10seq"`, call `setRenderSettings(prev => ({ ...prev, duration: 15 }))` once on selection. User can still override afterwards.

### 3. (Optional) Preview video
Leave `video` undefined for now — falls back to the `image` cover. Easy to swap in `/presets/elite.mp4` later.

## Files
- **Edited:** `src/lib/marketingStudio.ts` (one new entry in `FORMATS`)
- **Edited:** `src/pages/MarketingStudio.tsx` (one effect to bump duration to 15s)

## Verification
1. Open `/marketing`, open format picker → "Elite" appears in the Commercial tab with the "10-Sequence Phantom Reveal" subtitle.
2. Picking it locks the scene picker (same as other commercial presets) and the duration chip jumps to **15s**.
3. Composed final prompt contains all 10 sequences verbatim and ends with "The Ultimate Reveal".
4. Rendering produces a 15s clip via Seedance / chosen provider.

## Out of scope
- Custom preview video / poster
- Adding Elite to the Landing page template gallery
