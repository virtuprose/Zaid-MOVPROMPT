

User clarification: the third multi-shot option (10 shots) should be for **Kling 3.0**, not Seedance Pro. Kling 3.0 currently supports a 1↔2 frame toggle (start/end frame). User wants to add a multi-shot option to Kling 3.0 too.

## Question on scope

Kling 3.0 currently has `supportsTwoFrameToggle: true` (Single ↔ 2-frame transition). Adding multi-shot creates a 3-way choice: **Single | 2-frame | Multi-shot (10)**. Each Kling shot is a separate generation that the user stitches externally — Kling cannot natively output a stitched video, so the AI returns 10 standalone shot prompts with strict continuity rules.

## Plan

### 1. Contract — `src/lib/modelContracts.ts`
For `kling-v3` (Kling 3.0 only, not Omni/Edit/Motion/2.6/O1):
- Keep `supportsTwoFrameToggle: true` and `supportsAudio: true`.
- Add `supportsMultiShotToggle: true` and `multiShotCount: 10`.
- Add `extrasHintKey: "contract.hint.klingMultiShot"`.

### 2. UI — `src/components/WorkflowPanel.tsx`
When a model has BOTH two-frame and multi-shot toggles, render a 3-mode segmented control: **Single | 2 Frames | Multi-shot (10)**. Selecting multi-shot disables the 2nd upload slot and sends `workflowType: "multishot"` with `multiShotCount: 10`.

### 3. i18n — `src/i18n/translations/en.ts` + `ar.ts`
Add:
- `contract.toggle.multiShot10` → "Multi-shot (10)" / "متعدد اللقطات (10)"
- `contract.hint.klingMultiShot` → "Generates 10 connected Kling 3.0 shots with locked subject, lighting, and color continuity — render each separately and stitch."

### 4. Expert agent — `supabase/functions/generate-prompt/experts/kling.ts`
Extend `getKlingVariantHints` (or systemAddendum) with a multi-shot branch when `workflowType === "multishot"` and model is `kling-v3`:
- Output exactly N shots (driven by `multiShotCount`, default 10) as a 10-beat cinematic arc: **Establishing wide → Subject intro → Detail/Insert → Inciting beat → Reaction → Rising action → Push-in close-up → Peak moment → Aftermath → Resolution wide**.
- Each shot is a self-contained Kling prompt (80–180 words, one [camera:*] tag, no audio mentions).
- Strict continuity block per shot: locked subject identity (face, wardrobe, hair), lighting direction & color temperature, color grade — derived from the analyzed uploaded image.
- `referenceGuidance` explains continuity strategy across all 10 shots.
- `modelNotes` tells user: render each shot in Kling 3.0 separately, then stitch externally — Kling cannot produce a single stitched video.

### 5. Backend — `supabase/functions/generate-prompt/index.ts`
Already supports `multiShotCount` (clamped 3–10) and forwards it to the prompt. Verify only — no code change unless the schema cap needs raising for 10 shots (current cap allows 10 ✓).

### Files touched
- `src/lib/modelContracts.ts`
- `src/components/WorkflowPanel.tsx`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`
- `supabase/functions/generate-prompt/experts/kling.ts`

No DB changes, no new secrets.

