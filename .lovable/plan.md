## Goal
When the Director sidebar is expanded, give the Tasks section the dark background color from the screenshot (~`#131316` / `hsl(240 6% 9%)`).

## Change
In `src/pages/Director.tsx`, on the `<aside>` (expanded state only), wrap the sidebar content with the new background, rounded corners, subtle border, and inner padding so it reads as a distinct panel. Collapsed state stays unchanged.

- Add `bg-[hsl(240_6%_9%)] border border-border/40 rounded-xl p-2` to the expanded sidebar container.
- Keep collapsed (icon-only) state transparent as today.
- No changes to chat, media rail, or behavior.

## Out of scope
- Tokenizing the color into the design system (one-off match to attached swatch).
- Light mode styling.
