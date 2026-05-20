## Goal
Add **AI Director** as the lead card in the landing page Features grid — positioned as an agentic AI director, not just a prompt writer.

## Changes — `src/pages/Landing.tsx`

1. **Icon import**: add `Clapperboard` to the existing `lucide-react` import (signals direction/filmmaking better than a chat bubble).

2. **`FEATURES` array**: prepend a new entry so the Director leads the grid:
   ```
   {
     icon: Clapperboard,
     title: "AI Director",
     body: "An agentic director for your scenes. Chat through your vision and it generates images, video, and full storyboards — directing camera, light, and motion end-to-end.",
   }
   ```
   Order becomes: AI Director → Single Frame → Start+End → Multi-Shot.

3. **Card emphasis**: give the AI Director card a subtle "Flagship" treatment so it reads as the hero capability:
   - Add a small amber pill in the top-right of that card: `Flagship`.
   - Slightly stronger border (`border-accent/30`) and a soft amber glow shadow at rest.
   - Other 3 cards keep their current styling.

4. **Grid layout**: change `md:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-4` so 4 cards fit cleanly (2-up tablet, 4-up desktop).

5. **Section subhead**: update "Three modes. One goal. Cinematic prompts that actually work." → "One AI director. Four ways in. From a single frame to a full storyboard — directed end-to-end."

## Out of scope
- No changes to How It Works, SceneControl, Models, Hero, navbar, or footer.
- No new dependencies; reuses existing card styling, framer-motion reveals, and amber accent tokens.
- i18n files not touched (Landing copy is English-only today).
