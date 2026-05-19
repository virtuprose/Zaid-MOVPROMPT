## Goal
Replace `src/pages/Landing.tsx` with a new 9-section dark cinematic landing page using layered parallax, mouse-tracked depth, and the MovPrompt brand kit. Switch display font to **Space Grotesk**.

## Sections (top → bottom)
1. **Navbar** — sticky glass, "Mov" amber + "Prompt" white wordmark (no icon), anchor links (Features, How It Works, Testimonials), `Try It Free` amber pill → `/auth`. Mobile hamburger.
2. **Hero (100vh)** — 4 parallax layers (blurred amber orbs, perspective grid, drifting amber particles, fixed content), eyebrow pill, headline "Turn Stills Into Cinema", subhead, `Get Started` + `See Examples` buttons, "No credit card required". Mouse-parallax on orbs/grid.
3. **Stats bar** — Graphite card, 3 count-up stats (2,400+ Creators / 47,000+ Prompts Generated / 8 AI Video Models) with amber text-glow.
4. **How It Works** — 3 feature cards (Single Frame / Start + End / Multi-Shot) with Lucide icons, hover lift + amber glow, staggered parallax entrance.
5. **Scene Control** — split layout, left copy + chips (Subject/Background/Lighting/Atmosphere), right stylized mock card with 3D tilt and amber glow.
6. **Model Support** — 8 model badges (Kling, Veo, Runway, Seedance, Pika, Luma, Hailuo, Wan) with stagger fade-in.
7. **Testimonials** — 3 cards (Lina Ortega, Daichi Mori, Aria Patel) with amber quote mark, staggered parallax.
8. **CTA** — radial amber glow bg, "Stop Writing Prompts. Start Directing.", pulsing `Get Started Free` button.
9. **Footer** — minimal: wordmark, links (Privacy, Terms, About, Examples), email, copyright.

## Technical details
- **Fonts:** add Space Grotesk to the Google Fonts import in `src/index.css` (weights 500/600/700); update `tailwind.config.ts` `fontFamily.display` to `["Space Grotesk", ...]`. Keep Inter for body. Update memory index accordingly.
- **Tokens:** spec colors already align with existing `--background`, `--accent`, `--foreground`, `--card`, `--border`, `--muted-foreground`. Use semantic Tailwind classes (`bg-background`, `text-accent`, `border-border`, etc.) — no hex literals in components. Add a `--hairline` if needed (current `--border` already matches).
- **Parallax:** `framer-motion` `useScroll` + `useTransform` per section; `useMotionValue` + `useSpring` for cursor-driven hero offsets (3–8px range). `will-change: transform`, transform/opacity only.
- **Entrance:** `whileInView` with `viewport={{ once: true, amount: 0.3 }}`, 150ms stagger between siblings.
- **Count-up:** simple `requestAnimationFrame` hook triggered on `useInView`.
- **Reduced motion:** wrap parallax + count-up in `useReducedMotion()` gates; fall back to plain fades.
- **Responsive:** desktop full parallax; tablet halves the offsets; mobile drops parallax to fade-in only, single column, hero 28–32px, one orb.
- **Logo:** new `<MovPromptWordmark />` inline (Space Grotesk, amber "Mov" + foreground "Prompt") used in navbar and footer — does **not** touch existing PNG wordmark assets.
- **CTAs:** real `/auth` link (no placeholder `#`) to preserve the existing signup flow; anchor nav links remain hash-based.
- **SEO:** keep current `<Seo>` block at top of page.
- **Cleanup:** remove unused imports from old Landing (`logoMark`, etc.). Don't touch Director, AssistantAvatar, or any other page.

## Files to change
- `src/pages/Landing.tsx` — full rewrite
- `src/index.css` — add Space Grotesk to Google Fonts import, ensure heading `font-family` cascade still works
- `tailwind.config.ts` — `fontFamily.display` → Space Grotesk first
- `.lovable/memory/index.md` — update font note to "Space Grotesk display, Inter body"

## Out of scope
No auth changes, no Director/app changes, no new images, no backend work, no new routes. CTAs link to existing `/auth`.