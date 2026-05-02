## Root cause

The "Director at work" loader doesn't appear on the **first generation** because of a render-gate bug, not a styling/scroll bug.

In `src/components/WorkflowPanel.tsx`, the loader (`resultsBlock`) is mounted inside the right panel only when one of these two gates matches:

1. `(phase === "breakdown" || phase === "generate") && sceneFrames.length > 0` — used when the user analyzed the scene and has frames.
2. `phase === "generate" && sceneFrames.length === 0 && startOverBtn` — used when the user **skipped** analyze.

When you click **Skip → Generate** (or generate without analyzing), at the moment of clicking Generate the state is:

- `phase === "breakdown"` (Skip sets `breakdown`, not `generate`)
- `sceneFrames.length === 0`
- `isLoading === true`

→ Gate 1 fails (no scene frames). Gate 2 fails (`phase` is still `"breakdown"`, becomes `"generate"` only AFTER results arrive, on line 546).

So `resultsBlock` is never rendered while loading on the first generation — the skeleton, scroll target, and all of it simply don't exist in the DOM. After the API returns, `setPhase("generate")` runs and the real results panel appears immediately, skipping the loader entirely.

## Fix

Loosen the second gate so it also matches **while loading** (and accept `phase === "breakdown"`). The new condition:

```text
(phase === "breakdown" || phase === "generate")
&& sceneFrames.length === 0
&& (isLoading || results || startOverBtn)
```

Inside that branch:
- Render the back / start-over row only when `startOverBtn` exists (avoids an empty row during the very first loading state).
- Render the "skip-no-frames hint" info banner only when not loading and no results yet (it's a between-state hint — hiding it during loading keeps focus on the new loader).
- Always render `resultsBlock` so the cinematic loader appears immediately on click.

This is a single ~13-line edit in `src/components/WorkflowPanel.tsx` (replacing lines 1198–1210). No other changes needed — the auto-scroll effect from the previous turn already works once `resultsBlock` is in the DOM.

## Files to touch

- `src/components/WorkflowPanel.tsx` — relax the render gate for the no-scene-frames branch so the loader shows during the first generation.

## Out of scope

- The scene-breakdown branch (gate 1) already works correctly because `phase === "breakdown"` and `sceneFrames.length > 0` is true during loading there. No change needed.
- No styling, copy, or animation changes — those are already correct from the previous turn.
