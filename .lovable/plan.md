## Goal
In Single frame mode, the "Drop any still image" upload box currently stretches the full 720px column width, which makes it feel oversized and left-anchored. Constrain it to a tighter width and center it horizontally.

## Change
File: `src/components/WorkflowPanel.tsx` (single-slot branch around line 898)

Replace:
```tsx
<div className="grid gap-4 grid-cols-1">
  {Array.from({ length: activeSlots }).map((_, i) => (
    <ImageUploadZone ... />
  ))}
</div>
```

With:
```tsx
<div className="flex flex-col items-center gap-4 w-full">
  {Array.from({ length: activeSlots }).map((_, i) => (
    <div key={i} className="w-full max-w-[480px]">
      <ImageUploadZone ... />
    </div>
  ))}
</div>
```

## Scope notes
- Only affects Single frame (and Multi-shot single-concept) upload — the Start+End two-frame layout is untouched.
- No changes to ImageUploadZone internals, model picker, CTA, or other blocks.
- Mobile: `w-full` + `max-w-[480px]` keeps it full-width on small screens, centered on desktop.
