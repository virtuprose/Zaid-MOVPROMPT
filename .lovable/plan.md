# Tool screen polish — implementation plan

Touches `src/pages/Index.tsx`, `src/components/WorkflowPanel.tsx`, `src/components/OnboardingExamples.tsx` (or `EmptyStateExamples.tsx`), `src/components/ImageUploadZone.tsx`, and a small Tooltip addition. No backend or business-logic changes.

## 1. Nav (Index.tsx)
- Remove the `<img src={logoMark}>` mark to the left of "MovPrompt".
- Keep the wordmark only (`Mov` in amber + `Prompt` in foreground), matching the auth page.

## 2-5. Examples panel (right column)
Locate the right-side examples list inside `WorkflowPanel.tsx` (rendered via `OnboardingExamples` / `EmptyStateExamples`).
- Replace the heading text with `Examples · Try one or upload your own` — 13px, `text-muted-foreground`, sentence case, middle-dot separator (no all-caps, no em-dash).
- Each card:
  - Fixed height ~120px, horizontal layout: 100×100 thumbnail on the left (`aspect-video` 16:9 wrapper inside the 100px column — actually 100px square that crops the image with `object-cover`; the *thumbnail itself* renders 16:9 by using `aspect-video` and `w-[140px]` instead, then title/tags stacked to the right). Final spec: card = flex-row, h-[120px]; left = 16:9 thumb at `w-[140px] aspect-video rounded-md overflow-hidden`; right = title + tag chips stacked, `min-w-0`.
  - Default border: `border-border/60`.
  - Hover: `border-primary/40`, `bg-[#161618]`, `cursor-pointer`, and reveal a small `Use this →` label in `text-primary` text-xs at the right end (opacity 0 → 100 on hover).
- Panel top alignment: ensure the examples panel container starts at the same vertical position as the new "Choose your workflow" header on the left (remove any extra top padding/margin so both columns align at row 1 of the grid).

## 6. Replace info box with header + tooltip
- Remove the existing info/explanation box at the top of the workflow area.
- Add `<h2>Choose your workflow</h2>` — `text-sm font-medium text-foreground` (14px white).
- Next to it, render a `<HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />` wrapped in a shadcn `<Tooltip>` whose content shows the previous explanation copy.

## 7. Workflow toggle pills
- Update the three workflow toggles (Single frame / Start + End / Multi-shot) to:
  - Base: `px-5 py-3 rounded-full border text-sm transition-colors`
  - Inactive: `bg-transparent border-[#27272A] text-muted-foreground hover:text-foreground`
  - Active: `bg-primary/10 border-primary/40 text-foreground` plus a 2px amber bottom underline (`border-b-2 border-b-primary` or a pseudo-element). Active state is mutually exclusive.

## 8. Reorder the left column
Inside the left side of `WorkflowPanel`, render in this order:
1. "Choose your workflow" header + tooltip
2. Workflow toggle pills
3. `ImageUploadZone`
4. `ModelPicker` ("Pick your target AI model" card)
5. New primary CTA + secondary skip link (see #9)

This may require moving the model picker out of its current position (search for `<ModelPicker` inside WorkflowPanel and relocate; preserve existing props and `selectedModel`/`onSwitchModel` wiring).

## 9. Primary CTA + skip link
- New `<Button>` directly below the model picker, `w-full size-lg`, amber primary.
- Disabled when no image is uploaded; label = `Upload an image to continue`.
- Enabled when image present; label = `Analyze Scene`. Wire `onClick` to the existing analyze handler already present in WorkflowPanel (reuse — do not duplicate).
- Beneath it: a `<button>` text link `Skip & Generate Now →` in `text-muted-foreground text-sm hover:text-foreground`, centered, that triggers the same analyze flow without an image (or whatever the existing "skip" path is — if none exists, wire it to the same handler with a flag; default behavior: triggers analyze immediately).

## 10. Column alignment
- Wrap left and right panels in a CSS grid where both children start at `row-start-1`. Remove any conditional top padding/margin on the examples panel that pushes it down relative to the header.

## 11. Upload zone height
- In `ImageUploadZone.tsx`, reduce the dropzone min-height by ~20% (e.g. `min-h-[200px]` → `min-h-[160px]`, or whatever the current value is — read first, then trim ~20%).

## Out of scope
- No changes to analyze pipeline, model contracts, prompt generation, or any backend code.
- No translation key changes beyond the examples header label and CTA strings (added inline in English; Arabic falls back).
- Preserve all existing `data-tour` attributes on relocated elements.

## Verification
- Read updated WorkflowPanel section after edit to confirm structure.
- Visual check via preview at /.
