## Problem

The auto-attach mechanism already exists: `runImageGeneration` injects `pinnedSubject.url` into `reference_urls` for every subsequent image call. But `pinnedSubject` only resolves bubbles flagged with `subjectSheet: true`, which is only set when the sheet is created through the SubjectLock chip flow (`handleSubjectLockChoice`).

When the Director model calls `generate_reference_image` with `mode: "character_sheet"` directly (the common path — first-turn character sheet, product sheet, object sheet, or a regenerated sheet), the resulting bubble is NOT marked `subjectSheet`. Result: it never becomes pinned, and the next key frame / storyboard panel generates without the sheet attached, so identity drifts.

## Fix

In `src/components/director/DirectorChat.tsx`, inside `runImageGeneration` where the `imageBubble` is constructed (around line 514-523), auto-flag any `character_sheet` mode result as a pinned subject sheet — not only when the explicit `options.subjectSheet` was passed.

```ts
const isSheet = options?.subjectSheet || payload.mode === "character_sheet";
const sheetKind: "character" | "product" =
  options?.subjectKind ?? (payload.subject_kind === "product" ? "product" : "character");

const imageBubble: Bubble = {
  role: "generated_images",
  data: {
    mode: payload.mode,
    images: result.images,
    directorsNote: payload.directors_note,
    ...(payload.aspect_ratio ? { aspectRatio: payload.aspect_ratio } : {}),
    ...(isSheet ? { subjectSheet: true as const, subjectKind: sheetKind } : {}),
  },
};
```

Because `pinnedSubject` is a `useMemo` over `bubbles` that picks the latest `subjectSheet`, the next call to `runImageGeneration` (single_panel key frame, storyboard_panels, anything else) will see it and prepend its URL to `reference_urls` automatically — exactly the behavior the user wants.

## Reinforce on the agent side

Update the tool description in `supabase/functions/director-agent/index.ts` (around line 419-424) so the model knows the client now auto-attaches the latest sheet, but also that it should still pass it explicitly for `storyboard_panels` to be safe:

```
"Existing images to stay on-model. The client auto-attaches the most recent character/product/object sheet to EVERY image generation (single_panel key frames, storyboard panels, single-panel regenerations). For storyboard_panels you SHOULD still pass the sheet URL here explicitly — duplicates are de-duped."
```

And in the IDENTITY/SCENE LOCK rule (line 182), add: "Single-panel key frames also inherit the pinned sheet automatically — never re-describe the character from scratch, treat the sheet as the canonical identity."

## Out of scope

- Video generation reference attachment (user asked about images / key frames / storyboard).
- User-uploaded (non-generated) character images becoming pinned — would need a separate "pin this upload" affordance.
- Aspect-ratio behavior (already shipped in prior turn).
