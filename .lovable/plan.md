# Fix: Animate & Polish buttons unclickable

## Root cause

In `src/components/director/GeneratedImageCard.tsx`, each panel renders these absolute-positioned children, in this DOM order:

1. Panel number badge (top-left)
2. **Polish** button — `absolute top-1 right-1`
3. **Animate** button — `absolute top-1 right-9`
4. **Inspect** button — `absolute top-1 right-[68px]`
5. **Expand** button — `absolute inset-0` (covers the WHOLE panel)
6. Download (bottom-left)
7. Redo (bottom-right)

The Expand button (#5) is rendered **after** Polish/Animate/Inspect, so in stacking order it sits on top of them and swallows their clicks. That matches the session replay: hovering a panel only ever surfaces the "Expand", "Regenerate", and "Download" tooltips — never "Animate" or "Polish".

Download and Redo still work because they're rendered **after** Expand in the DOM, so they paint above it.

## Fix

In `GeneratedImageCard.tsx`, inside the panel `<div className="group relative …">` (around lines 358–465):

1. Move the **Expand** button block (lines 415–429) to render **first** inside the panel, immediately after the `<img>` — before the number badge, Polish, Animate, and Inspect. This puts the full-area Expand button at the bottom of the stack so the corner buttons sit above it and receive clicks.
2. Add `z-10` to each of the corner buttons (Polish, Animate, Inspect trigger, Download, Redo) as a belt-and-braces guarantee, and `z-0` to the Expand button.
3. No behavior change to Expand: clicking anywhere on the image (outside the small corner buttons) still opens the lightbox.

No other files change. No backend or logic change — purely DOM ordering + z-index inside one component.

## Verification

- Hover panel 3 → "Animate panel 3" tooltip appears on the amber icon, click triggers `onAnimatePanel`.
- Hover panel 3 → "Polish panel 3" tooltip appears on the wand icon, click opens the Polish popover.
- Clicking the empty image area still opens the Expand lightbox.
- Download and Redo continue to work.
