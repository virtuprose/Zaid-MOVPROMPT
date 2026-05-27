## Goals

1. The sticky bottom bar (Aspect chips + Duration scrubber + Generate + "Free" line) is taller than the page's bottom padding, so the last part of the scene content sits trapped under it — feels like scroll is locked.
2. With 6 aspect ratios now showing, the console looks crowded; the right-side "SELECTED 16:9 / 15s" block duplicates what the chips and scrubber already say.

## Changes (one file: `src/components/WorkflowPanel.tsx`)

### A. Fix the scroll lock
- Attach a `ref` to the sticky `mobileStickyCta` wrapper (line 1674) and measure its height with a `ResizeObserver`.
- Apply that height (+ a 24px breathing margin) as `paddingBottom` on the main scroll container (line 1859, currently hard-coded `pb-28`).
- Result: no matter how tall the bar gets (6 aspect chips, duration scrubber, safe-area inset), the last scene block is always reachable.

### B. Cleaner cinema console
Same bar, tightened:
- **Drop the "SELECTED 16:9 / 15s" readout** on the right — the active chip is already amber-glowing and the scrubber handle already shows the value. Removing it reclaims ~140px and removes the redundancy you can see in the screenshot.
- **Aspect chips**: shrink `min-w-[44px]` → `min-w-[38px]`, drop the inner `p-1` wrapper border, tighten gap to `gap-0.5`. Frame icons stay (they're the nicest part).
- **Duration**: keep the scrubber, but move the "Auto" pill (when present) inline at the end of the tick row instead of as a separate flex item, so the scrubber gets full width.
- **Bar chrome**: reduce outer padding `p-3` → `px-3 py-2`, swap `flex-wrap` for a 2-column grid on `sm+` (`grid sm:grid-cols-[auto_1fr]`) so Aspect and Duration align on one row at desktop and stack cleanly on mobile.
- **Labels**: keep the uppercase "ASPECT" / "DURATION" micro-labels (they're on-brand) but reduce tracking from `0.18em` → `0.14em` so they breathe better next to the controls.

### C. Generate CTA
- Slightly reduce vertical weight: `size="lg"` stays, but trim the wrapper `space-y-2` → `space-y-2.5` and add a thin 1px separator between the console and the button so the two zones read as distinct.
- "Free — no credits charged" line stays, unchanged.

## Out of scope
- No changes to aspect-ratio list, model controls, generation logic, or duration model.
- No changes to translations or other components.
- Light/dark theming untouched — still token-driven.

## Verification
- Scroll the page on `/` after upload → bottom scene card should clear the sticky bar with ~24px of air.
- Resize the window between mobile and desktop → bar should reflow to grid on sm+, stack on xs.
- Switch models (Seedance → Veo) → bar height changes (6 vs 3 chips); the padding fix should adapt automatically via ResizeObserver.