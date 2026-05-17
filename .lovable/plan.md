## Tighten MovPrompt home page — spacing & example sizing

Two main issues on `/`:
- The 3 example tiles are `aspect-square` × full-width 720px column → ~230×230 each, dominating the viewport.
- Vertical rhythm stacks `space-y-5` (leftPanel) + `space-y-6` (header group) + `space-y-3` (examples) + `pt-2` (upload), leaving a lot of empty whitespace between sections.

### Changes

1. **`src/components/OnboardingExamples.tsx`**
   - Tile aspect `aspect-square` → `aspect-[4/3]` (shorter, more landscape-cinematic).
   - Outer `space-y-3` → `space-y-2`.
   - Helper text `text-xs` → `text-[11px]` so it stops competing with the workflow heading.

2. **`src/components/WorkflowPanel.tsx`** (leftPanel, line 1206–1223)
   - Outer `space-y-5` → `space-y-4`.
   - Inner header group `space-y-6` → `space-y-4`.
   - `<div className="pt-2">` wrapping `uploadBlock` → drop the `pt-2` (the outer spacing already handles it).

3. **`src/pages/Index.tsx`** (line 45)
   - `py-3 sm:py-4` stays; nothing to change at the page container — it already has the right padding.

Result: examples shrink to ~230×173 (much calmer), and total page height drops by ~40-60px so the dropzone and CTA sit closer to the fold.