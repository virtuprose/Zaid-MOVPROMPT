## Goal

Replace the generic `ResultsSkeleton` with a dedicated **storyboard loader** when the user generates in **multi-shot** mode, so the longest wait in the app feels like watching a director assemble each shot in turn.

## Current behavior

In `src/components/WorkflowPanel.tsx` the `resultsBlock` always renders `<ResultsSkeleton />` while `isLoading` is true — even when `workflowType === "multishot"` and the request returns 3–10 shots. There is no per-shot affordance, so the user can't tell how many shots are coming or that progress is being made.

The generation API is a **single call** that returns all shots together (line 507 `supabase.functions.invoke("generate-prompt", …)`). We can't surface real per-shot progress, but we can simulate it in a way that matches what the model is doing under the hood (drafting one shot at a time).

## Plan

### 1. New component: `src/components/StoryboardSkeleton.tsx`

Props:
```ts
{ shotCount: number; modelLabel?: string }
```

Layout (top to bottom, same dark cinematic palette as `ResultsSkeleton`):

- **Director header card** — reuses the gradient + scanline overlay, animated `Clapperboard` icon, title `storyboard.title` (e.g. "Storyboarding {count} shots…"), subtitle `storyboard.subtitle`, eased shimmer progress bar (~14s to 92%), live `n / total` counter on the right.
- **Storyboard strip** — a responsive grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) of `shotCount` shot tiles. Each tile:
  - `aspect-video` panel with film-grain background and a `Shot N` label.
  - One of three states driven by an interval (~1800ms per shot, looping the last one as "polishing"):
    - **Pending**: dim, 8% opacity icon, dotted border.
    - **Active**: glowing cyan border, animated `Camera` icon panning left↔right, mini progress sub-bar with `shimmer-sweep`, status line cycling through `storyboard.status.compose → light → frame → lock` every ~450ms.
    - **Done**: solid border, checkmark badge, status `storyboard.status.locked` in cyan, frozen mini-bar at 100%.
- **Trivia card** — same component shape as `ResultsSkeleton`/`AnalyzingSkeleton`, but with 4 storyboard-specific cinematography facts (shot list, coverage, axis of action, montage).

Animation primitives reuse the existing `shimmer-sweep` keyframe pattern; `framer-motion` for tile state transitions and trivia crossfade.

### 2. Wire into `src/components/WorkflowPanel.tsx`

- Import `StoryboardSkeleton`.
- In the `resultsBlock` `AnimatePresence` (around line 1104, the `key="results-skeleton"` branch), branch on `workflowType`:
  ```tsx
  {workflowType === "multishot" ? (
    <StoryboardSkeleton
      shotCount={Math.min(10, Math.max(contract.multiShotCount ?? 3, elementItems.length, 2))}
      modelLabel={…}
    />
  ) : (
    <ResultsSkeleton modelLabel={…} />
  )}
  ```
- No other render gates change — the existing auto-scroll on `isLoading` already targets the same container.

### 3. i18n keys

Add to `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts` under `storyboard.*`:

- `storyboard.title` — "Storyboarding {count} shots…"
- `storyboard.subtitle` — "Drafting coverage, blocking, and continuity for {model}."
- `storyboard.shotLabel` — "Shot {n}"
- `storyboard.status.compose`, `.light`, `.frame`, `.lock`, `.locked`
- `storyboard.triviaLabel`
- `storyboard.trivia.shotlist`, `.coverage`, `.axis`, `.montage`

## Files to touch

- **New:** `src/components/StoryboardSkeleton.tsx`
- **Edit:** `src/components/WorkflowPanel.tsx` (import + branch in skeleton renderer)
- **Edit:** `src/i18n/translations/en.ts` (+ `storyboard.*`)
- **Edit:** `src/i18n/translations/ar.ts` (+ Arabic versions)

## Out of scope

- Single-frame and two-frame loaders (already handled by `ResultsSkeleton`).
- Real per-shot streaming from the edge function — the API returns all shots at once.
- Layout shift on results arrival — `ResultsPanel` already renders into the same container, so the existing exit transition handles it.
