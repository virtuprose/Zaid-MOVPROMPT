# Brand Kit — redesign + content tightening

Two parallel goals: make the side panel feel on-brand (cinematic dark + cyan/amber accents instead of flat black), and turn its fields into something the Director actually uses when writing scenes.

## Why the current panel falls flat

- Pure flat black, no depth, no accent — doesn't match the rest of VidoPrompt (cyan/amber glow, Space Grotesk headings).
- Sections are visually identical — eye has nothing to lock onto, swatches and chips read as a wall of dots.
- Logo tile is a tiny 64×64 square next to a bare "Upload" button — no drop zone, no preview affordance.
- Color preset row repeats verbatim in two sections (Primary + Supporting) — feels lazy.
- Typography "vibe" cards are unstyled — labels rendered in body font, so you can't see the vibe you're picking.
- Fields are generic ("mood notes", "tagline") — none of them describe the things a DoP actually needs: lighting, finish, pacing, logo treatment.

## Redesign — visual direction

Locked tokens: cinematic dark surfaces, `primary` cyan, `accent` amber, Space Grotesk display / Inter body. Light mode follows the same token map.

Structure of the new sheet (top → bottom):

1. **Header band** — sheet header gets a faint cyan→amber gradient hairline under the title, palette icon swapped for an amber glow chip. Subtitle: *"Your brand's DNA — used on every shot the Director writes."*
2. **Logo card** — full-width dashed drop zone (matches the existing Visuals drop zone in `BrandKitSheet`), live preview tile on the left, "Replace / Remove" inline. Empty state shows a soft cyan ring on hover.
3. **Color system** — single grouped card with three rows: **Primary** (large swatches, selected one gets amber ring + hex label), **Supporting** (smaller swatches, max 4, drag-style chips with hex), **Avoid** (destructive-tinted chips, presets shown as outline pills).
4. **Typography** — replace tiny label cards with preview tiles that render each vibe *in its own font* (Inter, Playfair, Bebas, Caveat, JetBrains Mono via Google fonts already available). Selected tile gets amber border + subtle inner glow.
5. **Cinematic feel** *(new section)* — 2-col chip grid for the four new prompt-shaping fields below.
6. **Voice** — tagline + a new short "brand voice" line (≤120 chars).
7. **Footer** — sticky, with **Clear** ghost on the left, **Cancel / Save brand kit** on the right. Save button stays amber but uses the design-system `bg-accent` token instead of the hardcoded `#F5A524`.

Micro-details:
- Replace every hardcoded `#F5A524` with `bg-accent` / `text-accent` / `ring-accent`.
- Cards use `bg-card/40` with `border-border/60` and a 1px inner highlight on top (`shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]`) for the cinematic-glass feel used elsewhere.
- Selected states use amber ring (`ring-2 ring-accent`) + soft glow (`shadow-[0_0_0_4px_hsl(var(--accent)/0.12)]`).
- Section headers in Space Grotesk, uppercase tracking-wide micro-eyebrow above the label.

## Content — make it useful for video

Current fields stop at colors + "mood notes". A DoP brief needs more. Add these (all optional, all pipe into `brandIdentityLine` and `write-ad-scene`):

| New field | Type | Why it matters to the model |
|---|---|---|
| `lighting_style` | enum chip: *natural, soft studio, hard contrast, golden hour, neon night, overcast* | Drives the actual lighting plan in every shot |
| `finish_vibe` | enum chip: *premium glass, matte minimal, organic warm, industrial raw, playful pop, retro film* | Controls textures, surfaces, props |
| `pacing` | enum chip: *slow & elegant, balanced, punchy & fast* | Affects camera moves and cut rhythm hints |
| `logo_treatment` | enum chip: *none, subtle watermark, end-card reveal, hero product placement* | Tells the Director where/whether to feature the logo |
| `brand_voice` | short text (≤120 ch) | Used for any on-screen text / VO suggestions |
| `industry` | short text (≤40 ch) | Anchors the visual world (skincare vs SaaS vs fashion) |

Reword existing labels for clarity:
- "Mood / style notes" → "Free-form notes — anything else the Director should remember" (helper text explains examples).
- "Avoid colors" helper → "Hard no's. The Director won't use these in lighting, props, wardrobe, or backgrounds."
- "Typography vibe" helper → "Used for any on-screen text in the video."

### Wire-through (so the new fields actually reach the prompt)

1. DB: add 6 nullable columns to `brand_identities` (`lighting_style text`, `finish_vibe text`, `pacing text`, `logo_treatment text`, `brand_voice text`, `industry text`). No RLS change.
2. `src/lib/marketing/brandIdentity.ts` — extend `BrandIdentity` type, `EMPTY_BRAND_IDENTITY`, `save()` payload, `reload()` mapping.
3. `src/lib/marketingStudio.ts` — extend `BrandIdentityContext` and `brandIdentityLine()` so each new field appends a clean phrase (e.g. `lighting: golden hour`, `finish: premium glass`, `pacing: punchy`, `logo treatment: end-card reveal`, `voice: ${brand_voice}`, `industry: ${industry}`).
4. `supabase/functions/write-ad-scene/index.ts` — mirror the same fields in `BrandIdentityLite` + the inline prompt builder.
5. `src/pages/MarketingStudio.tsx` — pass the new fields into the brief payload (single object spread, already centralised).

## Files touched

- `src/components/marketing/BrandIdentitySheet.tsx` — full visual rewrite + new field UI.
- `src/lib/marketing/brandIdentity.ts` — type + persistence.
- `src/lib/marketingStudio.ts` — `BrandIdentityContext` + `brandIdentityLine`.
- `supabase/functions/write-ad-scene/index.ts` — `BrandIdentityLite` + prompt line.
- `src/pages/MarketingStudio.tsx` — pass-through.
- `supabase/migrations/<ts>_brand_identity_video_fields.sql` — 6 nullable columns.

## Verification

- Open Brand Kit on dark + light theme → header gradient, amber selected states, typography tiles render in their real fonts, drop zone hover glows cyan.
- Save with all new fields populated → row persists; reopen → all values rehydrate.
- Generate a scene in Marketing Studio → inspect the prompt sent to `write-ad-scene` and confirm the new bits (`lighting`, `finish`, `pacing`, `logo treatment`, `voice`, `industry`) appear in the brand-identity line.
- Clear brand kit → row deleted, sheet returns to empty state.
