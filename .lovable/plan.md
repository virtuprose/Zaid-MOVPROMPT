# Magnific-style cinematic hero

Recreates the attached reference as a **new standalone page** at `/hero-preview` so your current Landing and Index stay untouched. You can review it in isolation, then we can promote it to `/` if you like it.

## What it will look like

- **Full-bleed cinematic background** — uses your existing `src/assets/loop-portrait.mp4` (autoplay, muted, loop, `object-cover`) with a warm color-grade overlay + subtle vignette + fine grain to match the Magnific reds/ochres.
- **Top nav** — transparent, minimal: logo-mark on the left, text links (Create, Models, Library, Learn), a pink **Upgrade** accent link, a search pill, and the user avatar on the right. Matches reference spacing exactly.
- **Hero block (left-aligned, ~55% width)**:
  - Small pill badge: `Ranked #1 AI video prompt director · Read the docs →`
  - Massive display headline (2 lines, white, ~88px desktop / clamp down for mobile): **"The director's platform to shoot your best work"**
  - Subhead (~18px, 80% white): "Every AI video model. Intelligent storyboards. Frame-perfect prompts. On-brand cinematography at any scale."
  - Two CTAs: white solid **Start creating** + dark glass **▶ Why VidoPrompt?**
- **Right-side rotating word column** (the signature Magnific move):
  - Vertical stack of ghosted words that scrolls slowly upward on a loop
  - Pink ▶ marker pinned at vertical center highlights the active word in white
  - Words: *Scale campaigns · Generate prompts · Shoot cinematic shots · Build storyboards · Stitch scenes · Lock characters · Direct shots · Cast subjects · Stay on brand*
- **Trust strip** at the bottom: "Trusted by creators, studios & agencies" + 6–7 grayscale logo placeholders (SVG text marks — easy to swap later).

## Typography & color

- Headline: **Fraunces** (variable display serif-sans hybrid that matches Magnific's "Migra"-style condensed feel) loaded via Google Fonts, weight 700, tight tracking, -0.02em.
- Body/UI: keep your existing Inter.
- Accent pink for the ▶ marker + Upgrade link: `#FF3D7F` (Magnific-style hot pink), added as `--magnific-accent` token scoped to this page only — won't affect your global cyan/amber tokens.
- Overlay: warm gradient `from-[#3a1a18]/30 via-[#6b2820]/20 to-[#2a0e0c]/60` + 4% noise.

## Files

**New:**
- `src/pages/HeroPreview.tsx` — the page
- `src/components/hero/CinematicHero.tsx` — hero composition
- `src/components/hero/RotatingWordColumn.tsx` — right-side word reel (Framer Motion infinite loop)
- `src/components/hero/HeroTopNav.tsx` — transparent top nav variant
- `src/components/hero/TrustLogos.tsx` — grayscale logo row

**Edited (minimal):**
- `src/App.tsx` — register `<Route path="/hero-preview" element={<HeroPreview />} />`
- `src/index.css` — add `@keyframes grain` + `.bg-grain` utility, and `@keyframes word-reel` (slow vertical scroll). No changes to existing tokens.

## Motion details

- Headline: per-word fade-up stagger (Framer Motion, 60ms stagger, ease-out 0.6s) on mount.
- Background video: 1.05 scale + 30s ken-burns pan via CSS keyframes for ambient life.
- Word reel: `translateY` infinite loop, 22s duration, paused on hover, active word detected by IntersectionObserver against the central ▶ line so the highlight is always accurate.
- CTAs: subtle hover scale 1.02 + glow.

## Out of scope

- No backend wiring, no auth, no analytics changes.
- No edits to `Landing.tsx`, `Index.tsx`, `WorkflowPanel`, `DirectorChat`, or any existing route.
- Logos are text-based SVG placeholders — swap to real partner logos later if/when relevant.

After you approve, I'll build it and you can review at `/hero-preview`. If you love it, one follow-up message promotes it to `/`.
