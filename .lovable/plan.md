# Plan: Wire "Why MovPrompt?" button to /docs

The button in `src/components/hero/CinematicHero.tsx` (lines 119–126) is currently a `<button>` with no handler. Convert it to a `<Link to="/docs">` while keeping the same styling, Play icon, and label so it navigates to the docs page on click.

## Change
- Replace the `<button …>` element with `<Link to="/docs" …>` using the existing classes.
- Keep `Play` icon and "Why MovPrompt?" text unchanged.
- `Link` is already imported from `react-router-dom`.

## File touched
- `src/components/hero/CinematicHero.tsx`
