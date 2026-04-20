

## Plan — Polish UI: fix gaps, alignment, and visual rhythm

Looking at the current screen (Any Model selected), three issues stand out:

### 1. Model picker trigger looks unbalanced
The trigger centers "Any Model — Universal Prompt" with its description, but the chevron is pinned far right, leaving a big dead zone on the right and making the card feel lopsided.

**Fix**: Left-align the label + description inside the trigger (instead of centered), so the text flows naturally from the start edge and the chevron sits at a normal distance. Remove `items-center` on a block that forces centering; use `text-start` and tighten the inner span.

### 2. Hint strip width mismatches the toggle below it
The "Any Model picks the best specialist…" strip stretches the full container width (~880px), while the 3-way toggle under it is `max-w-md` (~448px) centered. Two different widths stacked = untidy.

**Fix**: Constrain the hint strip to `max-w-2xl mx-auto` so it lines up with the workflow content rhythm. Keep the toggle centered underneath at `max-w-md` — the nested widths now feel intentional (wider context → narrower control).

### 3. Vertical gaps too loose between major blocks
`Index.tsx` wraps model picker + workflow in `space-y-6` (24px) and `WorkflowPanel` itself starts with `space-y-6`. Between the picker card and the hint strip it reads as too much breathing room on desktop.

**Fix**: Tighten the outer wrapper in `Index.tsx` from `space-y-6` to `space-y-4`. Inside `WorkflowPanel`, keep `space-y-6` — but add a small top-level visual divider hairline above the hint only when it's the first element, so the hint reads as a subtitle for the picker rather than a floating island.

### 4. Toggle polish
The 3-way toggle pill uses `border border-border` + `bg-secondary/50`. Under the dark theme it's near-invisible against the background. Bump to `border-border/60` + `bg-secondary/70`, add subtle `shadow-inner`, and lift the active pill with a real `ring-1 ring-primary/30` instead of just `shadow-sm` so the selected mode reads clearly.

### Files touched
- `src/components/ModelPicker.tsx` — left-align trigger content; add `text-start` and remove any centering forcing the dead zone; trim trigger padding slightly.
- `src/components/WorkflowPanel.tsx` — wrap the hint strip in `max-w-2xl mx-auto`; upgrade toggle styling (border/bg/shadow + active ring).
- `src/pages/Index.tsx` — reduce wrapper spacing from `space-y-6` to `space-y-4`.

No translation changes, no logic changes, no backend changes.

### Verification
- Any Model view: trigger reads left-aligned cleanly with chevron close to text end; hint strip and toggle visually aligned; spacing between picker and hint feels like a related pair.
- Switch to Kling 3.0: trigger still looks balanced with the shorter label.
- Check RTL (Arabic): `text-start` flips naturally so the text begins from the right edge and chevron sits on the left.
- Mobile (narrow viewport): nothing overflows; toggle remains readable.

