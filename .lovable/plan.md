
## Goal
For **Seedance Pro** and **Seedance Pro Fast**, switch the workflow from the current 1↔2 frame toggle to a **Single ↔ Multi-shot (3 shots)** toggle. Multi-shot generates 3 connected shots in one prompt designed to be stitched into a single continuous video.

## Current state
- Both models go through `seedance` branch in `src/lib/modelContracts.ts` and currently get `supportsTwoFrameToggle: true` (1↔2 frames).
- Multi-shot today (in `WorkflowPanel`) renders **10 varied shots** for general models — too many here.
- Seedance expert agent (`experts/seedance.ts`) already knows how to produce a `shotStructure` field (numbered shot-by-shot breakdown).

## Approach

### 1. Model contract — new toggle type
Edit `src/lib/modelContracts.ts`:
- Add a new optional flag: `supportsMultiShotToggle?: boolean` and `multiShotCount?: number`.
- For `seedance-pro` and `seedance-pro-fast`: return single frame + `supportsMultiShotToggle: true`, `multiShotCount: 3`. Remove the 1↔2 frame toggle for these two.
- All other Seedance variants keep current behavior.

Also update `deriveWorkflowType()`:
- If multi-shot mode is active → return `"multishot"`.
- Otherwise → existing logic.

### 2. WorkflowPanel — UI toggle
In `src/components/WorkflowPanel.tsx`:
- When `contract.supportsMultiShotToggle` is true, render a **Single shot / Multi-shot (3)** segmented toggle (mirroring how the existing 1↔2 frame toggle is rendered).
- Single mode: 1 image slot, normal flow.
- Multi-shot mode: still 1 image slot (the concept frame), but the request sent to backend uses `workflowType: "multishot"` and a new field `multiShotCount: 3`.

### 3. Backend — honor `multiShotCount`
In `supabase/functions/generate-prompt/index.ts`:
- Accept optional `multiShotCount` (validate: integer 3–10, default 10 for backward compat).
- Pass it into the system prompt for multishot mode so the AI generates exactly N shots instead of always 10.

In `supabase/functions/generate-prompt/experts/_base.ts`:
- Update the `multishot` workflow description: "generate exactly N shots (default 10, or as specified by the request)".

In `supabase/functions/generate-prompt/experts/seedance.ts`:
- Add a note in `systemAddendum`: when workflowType is `multishot` with count=3, design the 3 shots as a **continuous sequence** (Shot 1 = opening, Shot 2 = middle action, Shot 3 = resolution) intended to be **stitched into a single video** — consistent subject, lighting, and color grade across all 3.

### 4. Results display
The existing `ResultsPanel` already handles multiple shot cards, so 3 shots will render naturally. Add a small helper line at the top of multishot results when count=3 + Seedance: *"These 3 shots are designed to be stitched into one continuous video"* (new i18n key `results.multishotStitchHint`).

### 5. i18n
Add to `en.ts` + `ar.ts`:
- `contract.toggle.singleShot` — "Single shot"
- `contract.toggle.multiShot3` — "Multi-shot (3)"
- `contract.hint.seedanceMultiShot` — "Generates 3 connected shots to stitch into one video"
- `results.multishotStitchHint`

### Files touched
- `src/lib/modelContracts.ts`
- `src/components/WorkflowPanel.tsx`
- `src/components/ResultsPanel.tsx` (small hint line)
- `src/i18n/translations/en.ts`, `ar.ts`
- `supabase/functions/generate-prompt/index.ts`
- `supabase/functions/generate-prompt/experts/_base.ts`
- `supabase/functions/generate-prompt/experts/seedance.ts`

No DB changes, no new dependencies.
