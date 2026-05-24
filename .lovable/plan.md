## Apply `lockScene` to self-contained formats

Add `lockScene: true` to the following format entries in `src/lib/marketingStudio.ts`, so the Scene/Location step is hidden when these are selected:

1. **Speed Reveal** (`hyper-motion`) — studio FPV on color backdrop
2. **Hype Motion** (`hype-motion`) — phantom-cam macro on clean backdrop
3. **Tactile Stop-Motion** (`tactile-stopmotion`) — handcrafted diorama IS the set
4. **Hero Shot** (`hero-shot`) — bakes its own monolithic atmosphere
5. **Animated Explainer** (`animated-explainer`) — motion graphics canvas

Realistic 3D already has `lockScene: true` from the prior change.

### Untouched (scene/location is core to the storytelling)
Lifestyle, Fashion Dream, Cinematic Fashion, Before/After, Talking Avatar, all UGC variants (UGC, Tutorial, Unboxing, Testimonial, Reaction, POV, Day in the Life).

### Result
Picking any of the 5 formats above skips Scene/Location and jumps straight to render. No schema or UI changes — the `lockScene` flag is already wired.
