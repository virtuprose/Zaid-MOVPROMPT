## Goal
Use the uploaded `0520.mp4` as an ambient background video behind the hero section of the public landing page (`/`), keeping headline and CTAs readable.

## Steps

1. **Add the video asset**
   - Copy `user-uploads://0520.mp4` to `public/hero-bg.mp4` (kept in `public/` so it streams directly instead of being bundled).

2. **Wire it into the Hero on `src/pages/Landing.tsx`**
   - Inside the existing `<Hero>` section (just above the current ambient layers), add a `<video>` element:
     - `src="/hero-bg.mp4"`, `autoPlay`, `muted`, `loop`, `playsInline`, `preload="metadata"`, `poster` omitted.
     - Absolutely positioned, `inset-0`, `w-full h-full object-cover`, `pointer-events-none`, `aria-hidden`.
   - Add a dimming overlay on top of the video:
     - A dark gradient layer (`bg-background/70` plus a radial vignette) so the existing amber god-rays, grid, and headline stay legible.
   - Respect `useReducedMotion()` — when reduced motion is on, skip autoplay (omit the video, keep current static layers).

3. **Preserve existing parallax layers**
   - Keep the amber wash, god-rays, perspective grid, haze, grain, and vignette so the hero still feels cinematic; the video sits as the deepest layer (z-index below all of them, content stays on `z-10`).

4. **Performance hygiene**
   - `playsInline` for iOS, `muted` so autoplay is allowed, `preload="metadata"` to avoid blocking initial paint.
   - Only mount the video on the landing route (no impact on other pages).

## Out of scope
- No changes to Auth, Director, or any other page.
- No audio, no controls, no analytics on the video.
- Video file is not optimized/transcoded — we ship the upload as-is. If it's large, we can compress in a follow-up.
