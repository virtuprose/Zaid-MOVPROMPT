

## Move generated prompts above the scene breakdown

**Problem:** After clicking **Generate Cinematic Prompt** following an Analyze, the new result cards render *below* the scene-elements breakdown (see right panel, `WorkflowPanel.tsx` lines 1014–1128). Users have to scroll past every locked/moved element badge to read the prompt they just asked for. On a 1144px viewport with 5–8 elements, the prompt is fully off-screen.

### Change (single file: `src/components/WorkflowPanel.tsx`, lines 1014–1154)

Re-order the right panel so the result block (skeleton + ResultsPanel) renders **above** the scene breakdown whenever results exist or are loading. The scene breakdown stays mounted underneath so users can still tweak elements and regenerate.

**New right-panel order (top → bottom):**

```
┌─────────────────────────────────────┐
│ Toolbar: ← Back · Start Over · Re-Analyze │  (unchanged)
├─────────────────────────────────────┤
│ ▼ NEW POSITION                      │
│   ResultsSkeleton  (while loading)  │
│   ResultsPanel     (when ready)     │
├─────────────────────────────────────┤
│ Review hint banner                  │
│ Reset-snapshot undo bar (if any)    │
│ SceneBreakdown (frames + elements)  │
└─────────────────────────────────────┘
```

When there are no results yet (just analyzed, before Generate), the layout is unchanged — toolbar, hint, breakdown — so the breakdown still leads the view during the review phase.

### Implementation notes

- Lift the `<AnimatePresence>` block that renders `ResultsSkeleton` / `ResultsPanel` (current lines 1108–1128) out of its current position and place it **immediately after the toolbar row** (after line 1035), but still *inside* the breakdown's `motion.div` wrapper so the existing fade transition is preserved.
- The review hint banner, reset-snapshot bar, and `SceneBreakdown` stay in their current order, just shifted below the results block.
- Keep the standalone `phase === "generate" && sceneFrames.length === 0` fallback (lines 1100–1105) for the Skip path — results already render below it via the same `<AnimatePresence>`; just ensure that branch still shows results above any leftover toolbar.
- `showRightEmptyState` logic and the empty-state card (lines 1130–1152) unchanged.
- No changes to `ResultsPanel`, `SceneBreakdown`, or any state.

### Optional polish (recommended, ~3 lines)

When results arrive, smooth-scroll the right panel to the top of the results block so the user's eye lands on the prompt:
```ts
useEffect(() => {
  if (results && resultsRef.current) {
    resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, [results]);
```
Attach `resultsRef` to the wrapper around `ResultsPanel`.

### Alternative flow considered (not chosen)

- **Collapse breakdown after Generate**: hide scene elements behind a "Show scene breakdown" disclosure once results arrive. Cleaner but removes the at-a-glance context users rely on for regeneration tweaks. Happy to switch to this if you prefer — just say the word.

### Out of scope

- No change to left panel, generation logic, or model behavior.
- No restyle of `ResultsPanel` or `SceneBreakdown` cards.
- No change to the Skip-path layout when no scene frames exist.

### Verification

1. Upload → Analyze → Generate → result card appears at the **top** of the right panel; scene breakdown sits below it.
2. Scroll behavior: on a 1144px viewport, the prompt header is visible without scrolling.
3. Regenerate from the breakdown → loading skeleton replaces the result card *in place at the top*; breakdown stays put.
4. Skip path (no scene frames) → result still renders correctly under the small Back/Start-Over row.
5. RTL Arabic → ordering identical, no layout breakage.

