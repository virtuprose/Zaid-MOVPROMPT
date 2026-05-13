## Goal

When the user is about to do their **first generation ever**, show a short helper description under each of the two CTAs so they understand the difference between them. After the first successful generation these descriptions disappear permanently.

## What the user will see

Only on the very first visit (until first generation completes), under the upload zone:

- **Analyze Scene** button → small caption below it:
  "Recommended — we'll read your image first to write a richer, scene-aware prompt."

- **Skip & Generate Now →** link → small caption below it:
  "Faster path — generates a prompt from your settings only, without analyzing the image."

After the user generates once, both captions vanish on every following visit.

## How it works (technical)

- A flag already exists: `localStorage` key `movprompt.firstGenerationDone`, exposed in `WorkflowPanel.tsx` as `hasGeneratedBefore`. It flips to true after the first generation completes.
- Reuse it. No new state, no new storage key.
- Add the two captions inside the existing `phase === "upload"` CTA block in `WorkflowPanel.tsx` (around the Analyze button + Skip link, lines ~995–1023), conditionally rendered when `!hasGeneratedBefore`.
- Style: 12px, muted foreground, centered, tight line-height. Animated fade-in via the existing framer-motion patterns already used in the file.
- Add the two new strings to `src/i18n/translations/en.ts` (and other locale files if present) with keys like `wp.firstUse.analyzeHint` and `wp.firstUse.skipHint` so the copy is translatable.

## Files to change

- `src/components/WorkflowPanel.tsx` — render the two hint captions when `!hasGeneratedBefore` in the upload-phase CTA block.
- `src/i18n/translations/en.ts` (+ any sibling locale files) — add the two new translation keys.

## Out of scope

- No new tooltip, popover, or dismiss button — captions auto-disappear after the first generation, which matches the request "only will show on his first generation".
- No changes to the model picker, workflow toggle, or example cards.
