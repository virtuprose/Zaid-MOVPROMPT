# Plan: In-app Docs page for "Read the docs"

The hero badge button currently points to `/learn`. We'll build a dedicated, cinematic **/docs** page that matches the MovPrompt hero aesthetic (dark theme, Space Grotesk + Inter, cyan/amber accents) and route the button to it.

## What gets built

### 1. New page: `src/pages/Docs.tsx`
A single-scroll, sectioned documentation page with:
- Sticky top nav reusing `HeroTopNav` for brand consistency
- Hero strip: eyebrow chip ("Documentation"), H1 "MovPrompt Docs", short subtitle, back-to-home link
- Left sticky TOC (desktop) / mobile `<select>` jump menu, with scroll-spy highlighting
- Sections:
  1. **Getting started** — 3-step quickstart (open Director, describe a shot, generate)
  2. **Workflows** — Single frame, Two frames, Multi-shot storyboard (cards w/ thumbnails)
  3. **Models** — Table: Kling, Veo, Seedance, Any — strengths & when to use
  4. **Scene analysis** — Move vs Lock subject, reset tips
  5. **Writing descriptions** — @mentions, do/don't bullets
  6. **References** — How reference images influence output
  7. **Examples** — 3 example prompt cards (reuse `ExampleCard`)
  8. **Pro tips** — Grid of 8 tips
  9. **FAQ** — Accordion
- Footer CTA: "Start creating" → `/director`

Content mirrors the existing `/learn` copy (already translated via `useLanguage`) so we don't duplicate translation keys — the Docs page imports from `LEARN_TOC` and reuses `LearnSection` + `ExampleCard`.

### 2. Route registration
- Add `<Route path="/docs" element={<Docs />} />` in `src/App.tsx` (lazy import to match siblings).

### 3. Wire the hero button
- In `src/components/hero/CinematicHero.tsx` line 68, change `<Link to="/learn">` → `<Link to="/docs">`.

### 4. SEO
- `<Seo title="Docs — MovPrompt cinematic prompt guide" description="..." path="/docs" />`
- Single H1, semantic sections, lazy images, canonical via Seo component.

## What we will NOT do
- Not removing or modifying `/learn` (kept as-is for existing links/SEO).
- Not adding new translation keys — reuse `learn.*` keys.
- No backend, no auth changes.

## Files touched
- **New:** `src/pages/Docs.tsx`
- **Edit:** `src/App.tsx` (add route)
- **Edit:** `src/components/hero/CinematicHero.tsx` (link target)
