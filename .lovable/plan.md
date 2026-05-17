## Problem

In `QuestionCard`, the duration question "How long should the clip be — 5s, 8s, 10s, or other?" renders a video upload slot. The word "clip" is in `VIDEO_RE` and is also in the "strong standalone noun" allowlist inside `detectMediaAsk()`, so the question is misclassified as an upload ask. `QuestionCard` already hides chip suggestions for duration questions, but the upload slot is rendered unconditionally whenever `ask && onAttach` is truthy.

## Fix

Single small change in `src/components/director/QuestionCard.tsx`:

- Gate the `QuestionUploadSlot` render with `!isDuration`, mirroring the existing pattern used for `suggestion`. The cleanest form is to also null out `mediaAsks[i]` when `DURATION_RE.test(q)` (same place where `suggestions` is already null-guarded), so downstream code (slot render, submit summary line, placeholder copy) all consistently treat duration questions as non-media.

Concretely, in the `mediaAsks` `useMemo`:

```ts
const mediaAsks = useMemo(
  () => questions.map((q) => (DURATION_RE.test(q) ? null : detectMediaAsk(q))),
  [questions],
);
```

No other files need to change. `detectMediaAsk()` stays generic (other features may still want "clip" to count as a video ask), and the suppression lives next to the existing duration handling.

## Verification

- Reload the affected session (`/director/<id>`); the second question should now show only the duration chips (`10s / 15s / 30s / 45s / Other`) and no upload slot.
- A genuine video ask like "Drop any reference clips you have" still renders the upload slot.
