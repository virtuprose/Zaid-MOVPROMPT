## Goal

Add a small icon button (sliders icon) next to the **Setting** chip in the composer card on `/marketing`. Clicking it opens a popover with three rows — **Aspect ratio**, **Quality**, **Duration** — matching the uploaded screenshot, so users can override the currently hard-coded render config (9:16 / 1080p / 5s).

## Files

- `src/pages/MarketingStudio.tsx` — add state + button + popover, feed values into `submitVideoJob`, update the "Renders as" summary.
- `src/components/marketing/RenderSettingsPopover.tsx` *(new)* — self-contained Popover UI with three expandable rows (aspect / quality / duration), mirroring the screenshot's dark glass style.

No backend or business-logic changes — render call already accepts `aspect_ratio`, `duration`, `resolution`, `audio`.

## UX

Chip row becomes:

```
[Format] [Hook] [Setting] [⚙︎]                    [Generate ad]
```

- Trigger button: 36×36, `rounded-full`, border + `bg-secondary/40`, `Sliders` icon (lucide), hover lifts border to amber when any value differs from defaults.
- Popover (≈ 320px, anchored bottom-start): three stacked rows, each a `rounded-xl` row with icon + label on the left, current value + chevron on the right. Tapping a row expands inline segmented controls (like the screenshot's drill-in style — kept inline rather than nested popovers for simplicity).
  - **Aspect ratio**: 9:16, 16:9, 1:1, 4:3, 3:4, 21:9 (seedance-2.0 supports all).
  - **Quality**: 480p, 720p, 1080p.
  - **Duration**: 5s, 8s, 10s, 15s (snap set from seedance-2.0 range 4–15).
- Defaults stay 9:16 / 1080p / 5s; audio stays on.

## Wiring

- New state in `MarketingStudio`:
  ```ts
  const [render, setRender] = useState({ aspect_ratio: "9:16", resolution: "1080p", duration: 5 });
  ```
- Pass `render` into `submitVideoJob(prompt, "seedance-2.0", null, { ...render, audio: true })`.
- Update the "Renders as" line to read from `render` instead of literals.

## Out of scope

- No model picker — still locked to `seedance-2.0`.
- No audio toggle in this dropdown (kept always on, matching current behavior).
- `VideoOptionsDialog` is not reused — it's a larger inline panel intended for the Director flow; this Marketing popover is a lighter trigger-anchored UI matching the screenshot.
