## Goal
The Brand Kit popup on `/marketing` is way too heavy (Identity, full Color system, Typography, Lighting, Finish, Pacing, Logo treatment, Voice, Mood notes, Tagline, Industry — 5 big sections). Strip it down to the essentials and let the product images do the rest of the work.

## New Brand Kit (only 2 things)

1. **Logo** — upload / replace / remove (unchanged).
2. **Colors** with a mode switch at the top:
   - **Auto from product** (default, recommended) — no color pickers shown. A small helper line: *"We'll pull the palette from your product photos so the ad matches your real product."*
   - **Custom** — reveals Primary swatch + Supporting (up to 4) + Avoid chips (the existing controls, kept as-is).

Everything else in the sheet is removed from the UI: Industry, Typography vibe + font hint, Lighting, Finish, Pacing, Logo treatment, Tagline, Brand voice, Free-form notes.

## Behavior

- The `brand_identity` row keeps all existing columns — we just stop writing to the hidden ones from this sheet, and clear them on save so old values don't keep leaking into prompts. (Schema unchanged; no migration.)
- A new local-only flag `colors_auto` (boolean, default `true` when no primary color is set) controls which UI block shows. We don't need to persist it: `primary_color === null && (supporting_colors ?? []).length === 0` already means "auto", which is exactly what we check.
- **Auto color resolution** happens in the prompt builder:
  - `src/lib/marketingStudio.ts` → `buildBrandLine`: when the identity has no primary/supporting colors, fall back to the active product's `hero_colors` (already extracted by `analyze-brand-image`). Emit them as `auto palette from product: #xxx / #yyy / #zzz`.
  - `supabase/functions/write-ad-scene/index.ts` → same fallback in the BRAND IDENTITY line builder, reading `brand.hero_colors` already passed through in the payload.
- "Avoid" stays available only in Custom mode (rarely used; not worth surfacing in Auto).

## Files to change

- `src/components/marketing/BrandIdentitySheet.tsx`
  - Remove the Identity (industry input), Typography, Cinematic feel, and Voice sections.
  - Keep the Logo block and replace the Color section with the Auto/Custom switch described above.
  - On save: write `industry, typography_vibe, font_hint, lighting_style, finish_vibe, pacing, logo_treatment, brand_voice, mood_notes, tagline` as `null` so stale values don't influence the prompt.
  - Trim the sheet header copy ("Your brand's DNA…") to something like *"Logo + colors. That's it — we infer the rest from your product."*
- `src/lib/marketing/brandIdentity.ts`
  - `hasBrandIdentity` — simplify to `!!(b.logo_path || b.primary_color || (b.supporting_colors?.length))` so the "Brand kit applied" chip on the ads page only lights up for the fields we still expose.
- `src/lib/marketingStudio.ts` (`buildBrandLine`)
  - Add the auto-from-product `hero_colors` fallback; stop emitting the removed fields if they're somehow still present (safe no-op since we null them on save).
- `supabase/functions/write-ad-scene/index.ts`
  - Mirror the same auto-color fallback using the product `hero_colors` already in the payload.

## Out of scope
- No DB migration. The hidden columns stay, just unused.
- Product fact sheet (`ProductFactSheet.tsx`) is a different surface (per-product) and isn't touched.
- No change to how product images are uploaded or analyzed — `hero_colors` is already populated today.
