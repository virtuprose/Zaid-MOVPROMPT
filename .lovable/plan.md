# Fix off-center upload zone on Single frame

## Problem
On `/` in the Single-frame workflow, the "Drop any still image" dashed box visibly sits left of the page center, even though the surrounding headings and model card are centered.

## Root cause
In `src/components/ImageUploadZone.tsx`, the empty-state branch renders:

```tsx
<div className="relative w-full h-full min-w-0 flex" ...>
  ...
  <motion.label className="upload-zone-empty ... flex flex-col items-center ..." />
</div>
```

The wrapper is `flex` (row) with no `justify-center`, and the `<motion.label>` itself has no `w-full`. So the label collapses to its intrinsic content width and aligns to flex-start (left) inside the 480px slot from `WorkflowPanel`. The preview branch is fine because that `motion.div` already uses `w-full h-full`.

## Fix
Single-line change in `src/components/ImageUploadZone.tsx`: add `w-full` to the `<motion.label>` className on line 123 so the empty dropzone fills its slot and stays centered under the headings.

No changes to layout, spacing, copy, or the preview state. No other files touched.

## Verification
- Reload `/` at desktop width, confirm the dashed dropzone is horizontally centered under "Pick your target AI model".
- Confirm preview-after-upload still looks correct (unchanged path).
- Confirm Start + End and Multi-shot layouts are unaffected (they wrap the same component in their own width containers).
