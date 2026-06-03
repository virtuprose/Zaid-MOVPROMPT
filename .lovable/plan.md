## Goal

Eliminate the faint cyan/teal rim that appears on the inside top edge of the "Describe your ad" box on `/marketing`.

## Root cause

The composer and the describe-input use translucent backgrounds (`/70`, `/40`) plus `backdrop-blur` on the outer card. They sit on top of a fixed amber radial glow and the dark, slightly blue‑tinted page background. The blurred bleed through the rounded corners reads as a thin cyan rim — most visible along the top edge where the amber blur sits.

## Changes (visual only, `src/pages/MarketingStudio.tsx`)

1. **Outer composer card** (line 822)
   - Replace `bg-[hsl(240_5%_8%)]/70 backdrop-blur` with a fully opaque surface, e.g. `bg-[hsl(240_5%_8%)]` and drop `backdrop-blur`.
   - This stops the page glow + body hue from bleeding into the card and producing the rim.

2. **Describe-your-ad inner wrapper** (line 966)
   - Replace `bg-background/40` with `bg-background/80` (or a fixed `bg-[hsl(240_5%_6%)]`) so the inner box doesn't pick up the cyan bleed from the outer card either.
   - Keep `border-border/50` — that border is neutral and not the problem.

3. **Leave alone**
   - The amber ambient blob (line 765) — it's desired atmosphere outside the card.
   - All borders, focus rings, and the mic button styling.

## Verification

- Reload `/marketing`, zoom into the top-left and top-right corners of the describe-your-ad box, and confirm the inner edge is a uniform neutral border with no coloured rim.
- Check the rest of the composer still reads as a layered dark card (no flat / muddy look).
- Quickly check the page on a wide viewport (the user is at 1113 CSS px) and a narrow one to make sure removing `backdrop-blur` doesn't change perceived depth in a bad way; if it does, we can keep `backdrop-blur` but use a fully opaque background colour, which alone is enough to kill the rim.

No backend, no logic, no token changes.
