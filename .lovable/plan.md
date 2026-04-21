
## Reorder: describe box above scene elements + confirm dialog before generation

### What changes

**1. Layout reorder (post-analysis breakdown phase)**
Move the description textarea (`SceneMentionTextarea`) to appear **above** the `SceneBreakdown` element list. Flow becomes:

```text
[Start Over] [Re-Analyze]
───────────────────────────────
Describe what the AI Director should do
(textarea with @mention support)
───────────────────────────────
Scene Elements (auto-assigned Move/Lock — user can adjust)
  • @1 Subject       [Lock] [Move]
  • @2 Background    [Lock] [Move]
  ...
───────────────────────────────
       [ Generate Cinematic Prompt ]
```

The AI already auto-assigns every element to `action: "move"` by default in `handleAnalyze` — we'll keep that behavior and surface a short helper line above the list: *"Review the auto-assigned Move/Lock choices and adjust if needed."*

**2. Confirmation dialog before generation**
Clicking **Generate Cinematic Prompt** in the breakdown phase opens an `AlertDialog` summarizing the user's edits:
- Count of locked vs. moving elements
- Prompt: *"Review your edits before generating. Once you confirm, the AI Director will build your cinematic prompt."*
- Buttons: **Go Back** (cancel) / **Go Ahead** (proceed → calls existing `handleGenerate`)

Only triggered from the scene-breakdown path. The "Skip → Generate Now" path stays untouched (no confirmation — it's the fast lane).

### Files touched

- `src/components/WorkflowPanel.tsx` — swap order of `SceneMentionTextarea`/`MentionTextarea` and `SceneBreakdown` in the breakdown block; add helper line; add `AlertDialog` that wraps the Generate button; route confirm → `handleGenerate`.
- `src/i18n/translations/en.ts` & `src/i18n/translations/ar.ts` — new keys:
  - `scene.reviewHint` — "Review the auto-assigned Move/Lock choices and adjust if needed."
  - `wp.confirmTitle` — "Confirm your edits"
  - `wp.confirmDesc` — "Review your edits before generating. Once confirmed, the AI Director will build your cinematic prompt."
  - `wp.confirmSummary` — "{locked} locked · {moving} moving"
  - `wp.goBack` — "Go Back"
  - `wp.goAhead` — "Go Ahead"

### Out of scope
- Skip-path flow, element-reference (Seedance) flow, and regeneration (`RefreshCw`) behavior remain unchanged.
- No backend changes.
