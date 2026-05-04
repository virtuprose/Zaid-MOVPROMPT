## Goal

After clicking **Analyze Scene**, show an entertaining cinematic loader in the right panel (instead of leaving the empty "Clapperboard" placeholder) while the `analyze-scene` edge function runs.

## Current behavior

In `src/components/WorkflowPanel.tsx`:
- Clicking Analyze sets `isAnalyzing = true`, but `phase` stays `"upload"` and `sceneFrames` is still empty.
- The right panel's gates therefore render `showRightEmptyState` (the static Clapperboard "empty" card) — no progress feedback at all while waiting 5–15s for the API.
- Only the small spinner inside the left-side Analyze button moves.

## Plan

### 1. New component: `src/components/AnalyzingSkeleton.tsx`

A focused, lighter sibling of `ResultsSkeleton`, themed for the **scene analysis** step:

- Animated `ScanSearch` icon with a sweeping scan-line over a small frame thumbnail strip (one tile per uploaded image, taken from `images[i].preview`).
- Title: "Analyzing your scene…" with a blinking cursor (matches `ResultsSkeleton` style).
- Subtitle: "Studying composition, subjects, lighting, and motion cues."
- Shimmer progress bar (eased to ~92% over ~8s) reusing the same `shimmer-sweep` keyframes pattern.
- Sequential checklist (4–5 items, ~1.4s each):
  - Reading frames
  - Detecting subjects & objects
  - Mapping composition & depth
  - Inferring lighting & mood
  - Drafting scene breakdown
- Rotating "Did you know?" trivia card (3–4 short cinematography facts about scene analysis / continuity / blocking).
- Same dark cinematic palette and `framer-motion` entrance as `ResultsSkeleton` — visually consistent.

Props:
```ts
{ framePreviews?: (string | null)[] }
```

### 2. Wire it into `src/components/WorkflowPanel.tsx`

- Import `AnalyzingSkeleton`.
- Add an `analyzingRef` and a `useEffect` that calls `scrollIntoView({ behavior: "smooth", block: "start" })` when `isAnalyzing` becomes true (mirrors the existing loading auto-scroll).
- In `rightPanel`, before the `showRightEmptyState` block, render:
  ```tsx
  {isAnalyzing && sceneFrames.length === 0 && (
    <div ref={analyzingRef}>
      <AnalyzingSkeleton framePreviews={images.map(i => i?.preview || null)} />
    </div>
  )}
  ```
- Update the `showRightEmptyState` condition to also exclude `isAnalyzing`, so the static empty card is hidden during analysis:
  ```ts
  const showRightEmptyState =
    !results && !isLoading && !isAnalyzing &&
    !((phase === "breakdown" || phase === "generate") && sceneFrames.length > 0);
  ```

### 3. i18n keys

Add to `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts` under a new `analyzing.*` namespace:
- `analyzing.title`, `analyzing.subtitle`, `analyzing.triviaLabel`
- `analyzing.checklist.read`, `.detect`, `.compose`, `.light`, `.draft`
- `analyzing.trivia.continuity`, `.blocking`, `.eyeline`, `.coverage`

## Files to touch

- **New:** `src/components/AnalyzingSkeleton.tsx`
- **Edit:** `src/components/WorkflowPanel.tsx` (import, ref + scroll effect, render block, update `showRightEmptyState`)
- **Edit:** `src/i18n/translations/en.ts` (+ `analyzing.*` keys)
- **Edit:** `src/i18n/translations/ar.ts` (+ Arabic versions)

## Out of scope

- The existing **Generate** loader (`ResultsSkeleton`) — already in place from previous turn.
- Changing the analyze API or its timing.
- Restructuring the empty-state placeholder beyond hiding it during analysis.
