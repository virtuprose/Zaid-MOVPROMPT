## Fix the two buttons in the image preview dialog

Both buttons live in `src/components/director/GeneratedImageCard.tsx` (the zoomed image dialog) — Download at line 785-792 and the `DialogClose` (X) at line 797-799.

### Issue 1 — Blue focus ring on Download button
After clicking, the browser's default focus state shows a bright blue ring (visible in the screenshot). It doesn't match the dark cinematic theme and looks like a stuck state.

**Fix:** add `focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20` to the Download button so the focus indicator is subtle and on‑theme. Apply the same to the X button for consistency.

### Issue 2 — X close button doesn't match the Download button
Today the two buttons drift visually:
- Download: `bg-background/80 hover:bg-emerald-500 hover:text-white` — green hover that makes it pop and look larger.
- Close (X): `bg-background/80 hover:bg-background` — bland, no clear hover accent, no `transition-colors`.

**Fix:** unify both buttons to the same size/shape/treatment (matching what the rest of the app uses for icon chips):
- Same classes: `bg-background/80 hover:bg-background/95 text-foreground p-1.5 rounded-md transition-colors`
- Same focus styling from Issue 1
- Drop the emerald hover on Download so the two buttons read as a matched pair, and the green/blue combo from the screenshot goes away

Result: two identical neutral icon buttons (Download on the left, X on the right) with a subtle on‑theme focus ring.

### Out of scope
- Other Download buttons elsewhere (MediaRailPanel, VideoBubble, PromptResultCard) — keep as‑is unless you ask.
- No logic, no a11y label changes, no layout changes.
