## Lock the Scene picker for Realistic 3D

The Realistic 3D format is a studio-style product commercial — phantom-cam macro shots on a clean color backdrop. A real-world location adds nothing and can fight the brief. The schema already has a `lockScene` flag that disables the Scene/Location picker when a format opts in (e.g. it's used to keep packshot-style formats clean).

### Change
- In `src/lib/marketingStudio.ts`, on the `realistic-3d` format entry, add `lockScene: true`.

### Result
- When the user picks **Realistic 3D** in Pick format, the Scene/Location step is locked/disabled (same UX as other lock-scene formats), so they jump straight to render.
- No other formats affected.
