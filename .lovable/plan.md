## Goal
Replace the current hero background in `src/pages/Landing.tsx` with a **volumetric god-rays** treatment: angled amber light shafts streaming from the top-right through a soft haze, layered behind the existing headline/CTA content.

## Approach
Pure CSS/SVG — no new images, no extra deps. Layers (back → front), all inside the hero's existing absolute-positioned background container:

1. **Base wash** — radial gradient from top-right (amber 12% → transparent 60%) over the existing `bg-background`, anchoring the light source.
2. **Light shafts** — an absolutely-positioned SVG (or `<div>` with `repeating-linear-gradient`) rotated ~22° from vertical, originating off-screen top-right. 6–8 soft amber shafts at varying widths/opacities (4–10% white→amber, blurred ~24px). `mix-blend-mode: screen` for the glow feel.
3. **Volumetric haze** — full-bleed radial gradient layer (background → transparent) at the bottom to fake atmospheric depth + a subtle noise/grain via existing SVG turbulence filter at ~3% opacity for the "dust in light" texture.
4. **Drift animation** — slow `translateX`/`opacity` keyframe on the shafts layer (20s ease-in-out infinite, ±8px) so the rays feel alive without distracting. Wrap in `useReducedMotion()` gate → static fallback.
5. **Vignette** — radial gradient overlay darkening the bottom-left corner so the headline contrast stays strong.

Existing parallax orbs/grid layers from the current hero: **keep the perspective grid**, **remove the blurred amber orbs** (replaced by the shafts which serve the same role better). Particles can stay subtle or be removed for clarity — recommend removing to let the rays be the hero.

## Tokens / styling
- All amber via `hsl(var(--accent))` with opacity modifiers — no hex literals.
- New keyframe `god-rays-drift` added to `tailwind.config.ts` under `keyframes` + `animation`.
- No new files; all changes scoped to `src/pages/Landing.tsx` + `tailwind.config.ts`.

## Files to change
- `src/pages/Landing.tsx` — swap hero background layers (orbs/particles → god-rays SVG + haze + vignette)
- `tailwind.config.ts` — add `god-rays-drift` keyframe + animation utility

## Out of scope
No changes to navbar, content, CTAs, other sections, or copy. No new assets or dependencies.
