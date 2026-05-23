## The idea — yes, let's build it

Right now the "products" panel holds the *thing being sold* (burger, sneaker, serum). What you're describing is the **brand layer on top** — the visual identity that controls how the ad *looks* regardless of which product is featured: logo, brand colors, typography, and a couple of "do / don't" notes.

A Brand Kit is reused across every ad. A product is what's *in* the ad. Two different concepts, both needed.

## What the user fills in (one-time, then reused)

A new **Brand Kit** card at the top of `/marketing`, above Products:

- **Logo** (upload) — already shown in ads where it makes sense (corner, end card)
- **Brand colors** — 1 primary + up to 4 supporting, picked from swatches or hex. Optional "use as dominant palette" toggle.
- **Avoid colors** — e.g. "no blue, no neon pink" (the exact pain you hit)
- **Typography vibe** — pick from a small list (Modern sans, Editorial serif, Bold display, Handwritten, Monospace) + optional font name if they know it. We can't ship real fonts to the video model, but we can describe the look so on-screen text matches.
- **Mood / style notes** — short free-text ("premium, minimal, lots of white space")
- **Tagline / brand line** (optional) — overrides the per-product tagline if set

One Brand Kit per user for v1 (keep it simple; multi-brand later if needed).

## How it changes the generation flow

The Brand Kit feeds the same two stages that the Product fact sheet already feeds, but at a different priority:

1. **Scene draft (`write-ad-scene`)** — gets a `brandKit` block alongside Product + Format + Setting. System prompt instruction: *"Apply the brand palette to lighting, props, and background tones. Avoid forbidden colors. Match the typography vibe for any on-screen text. Keep the product accurate."*

2. **Final video prompt (`composeStudioPrompt`)** — injects a **BRAND LOCK** block right after the existing PRODUCT LOCK:
   > Brand lock — Acme Co: primary #C8102E, supporting #1A1A1A / #F5F0E6. Avoid: blue, neon. Typography: bold editorial serif. Mood: premium, minimal. Apply to lighting, props, background, and any on-screen text. Do not recolor the real product.

**Priority order at render:**
1. Product Lock (product stays accurate — bun stays bun)
2. Brand Lock (palette, mood, typography vibe applied to *everything around* the product)
3. Format + Setting structure
4. Describe-box note (adaptation)
5. Model creativity

So if your brand is red/cream and you pick "UGC + Kitchen", the kitchen lighting leans warm, the props skew cream/red, the on-screen text matches your typography vibe — but the burger still looks like *your* burger.

## UI

- New "Brand Kit" strip at the top of `/marketing`, before the Products row. Compact card with logo thumbnail + color swatches + "Edit" button.
- "Edit Brand Kit" sheet (same pattern as `BrandKitSheet` for products): logo upload, color pickers (swatch + hex), avoid-colors chips, typography vibe picker, mood textarea.
- Small inline indicator on the Generate button: "Using Acme brand kit" so the user knows it's being applied.
- Toggle per-ad: "Apply brand kit" (on by default) — lets the user turn it off for a single render.

## Technical bits (skip if non-technical)

- **DB**: new table `brand_identities` (one row per user) with `logo_path`, `primary_color`, `supporting_colors jsonb`, `avoid_colors jsonb`, `typography_vibe`, `font_hint`, `mood_notes`, `tagline`. RLS by `user_id`. (Naming it `brand_identities` to avoid colliding with the existing `brand_kits` table, which is really *products*.)
- **`src/lib/marketing/brandIdentity.ts`**: `useBrandIdentity()` hook with `identity`, `saveIdentity`, `uploadLogo`. Mirrors `useBrandKit` shape.
- **New component**: `src/components/marketing/BrandIdentityCard.tsx` (compact strip) + `BrandIdentitySheet.tsx` (edit form). Reuse the swatch UI from the curated palette presets in the design-question system.
- **`MarketingStudio.tsx`**: render the new card above `BrandsRow`. Pass the loaded identity into the ad draft + render pipeline. Add the "Apply brand kit" toggle to render settings (`RenderSettingsPopover`).
- **`write-ad-scene/index.ts`**: extend payload schema with `brandKit`, extend system prompt to apply palette/avoid/typography.
- **`composeStudioPrompt`** in `src/lib/marketingStudio.ts`: add `BRAND LOCK` block after PRODUCT LOCK when identity is provided and toggle is on.
- No changes to the Products flow, FORMATS, or SETTINGS catalogs.

## What you'll feel

Set your brand kit once: logo, red + cream palette, "no blue", "bold editorial serif", "premium minimal". Now every ad — burger, fries, drink — comes out in your palette, with on-screen text that matches your vibe, never drifting into the generic blue/purple AI look. Products stay accurate; the *world around them* finally looks like your brand.

## One question before I build

For v1, should the Brand Kit be **one per user** (simplest, matches a single business owner) or **multiple brand kits** like the Products list (good if you're an agency running ads for several clients)?
