## Problem
The hero section (`src/pages/Landing.tsx`, lines 286–391) shows:
1. A blurry vertical yellow streak on the background — caused by the "god-rays" layer (lines 320–345). It's a stack of 7 vertical amber gradient bands rotated 22°, drifting with an animation, blurred 24px and screen-blended. With the dim 70% background overlay on top of the video, the brightest band reads as one ugly fat yellow vertical smear instead of cinematic light shafts.
2. The hero background video looks unclear — caused by stacking on top of it: a `bg-background/70` dimmer (70% opacity), the amber wash, the god-rays, the perspective grid, the bottom radial fade-to-bg, an SVG grain, and a bottom-left vignette. Together they mute and muddy the footage.

## Fix

In `src/pages/Landing.tsx` hero section:

1. **Remove the god-rays layer entirely** (lines 320–345). It's the source of the vertical yellow line and adds little value once toned down.
2. **Soften the amber wash** (line 316): drop opacity from `0.18` → `0.10` and pull it more to the corner so it reads as a light source, not a glow blob.
3. **Lighten the video dimmer** (line 306): change `bg-background/70` → `bg-background/40` so the footage stays legible.
4. **Add a subtle top-to-bottom gradient** instead of the heavy overlay, to preserve text contrast at the bottom without flattening the video:
   `bg-gradient-to-b from-background/30 via-background/20 to-background/70`
5. **Keep** the perspective grid, grain, and bottom vignette — they're subtle and on-brand.

Net effect: no yellow vertical streak, video reads sharp and cinematic, headline still has contrast.

## Out of scope
- No changes to headline copy, CTAs, layout, or other sections.
- No changes to the video asset itself.
