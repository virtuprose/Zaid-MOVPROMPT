
## Plan — AI Director recommends a target model for "Any Model" mode

When the user picks **Any Model (Universal Prompt)**, the AI already writes a model-agnostic prompt. The new ask: after analyzing the scene, the AI Director should **recommend which specific model** (Kling 3.0 / Veo 3.1 / Seedance Pro / etc.) fits this scene best, and that recommendation should appear **at the top of the main prompt box** — clearly labelled, not buried in notes.

### UX

- Only visible when the selected model is `any-model` (aka Universal). Other models don't get a recommendation — the user already chose.
- At the top of the result card, above `mainPrompt`, a highlighted strip:
  > **Director's pick: Veo 3.1** — Native synced audio + sustained motion makes this dialogue-driven scene land best here.
- Strip uses primary cyan accent border + subtle glow, matching the cinematic theme.
- Includes a small **"Use this model"** button that switches the active model in the picker so the user can immediately regenerate with the recommended specialist for an even better prompt.
- Bilingual — EN + AR, keys in the translation files.

### How the recommendation is produced

1. The `generate-prompt` edge function, when `targetModel === "any-model"`, adds a new required field to the structured output schema:
   - `recommendedModel: string` — must be one of the known model values (`kling-3.0`, `veo-3.1`, `seedance-pro`, etc.).
   - `recommendedModelReason: string` — one sentence, ≤ 25 words, explaining the pick based on scene analysis.
2. The generic agent's `systemAddendum` gets a new section: **"MODEL RECOMMENDATION PROTOCOL"** — a decision rubric the AI applies after scene decomposition:
   - Dialogue / lip-sync / native audio needed → Veo 3.1 (or Veo 3.1 Fast if short)
   - Choreographed multi-cut sequence → Seedance Pro
   - Product / fashion / element references → Seedance 2.0
   - Hero cinematic single shot / dramatic realism → Kling 3.0
   - Precise camera path (dolly/crane waypoints) → Kling 3.0 Motion Control
   - Edit an existing frame → Kling 3.0 Omni Edit or Grok Imagine Edit
   - Fast iteration / preview → Kling 2.5 Turbo or Veo 3.1 Fast
   - Multi-subject complex interaction → Kling 3.0 Omni or Kling O1 Video
3. The JSON schema enum for `recommendedModel` is restricted to valid values so the AI cannot invent a non-existent model.
4. For every non-`any-model` request, these two fields are simply not requested — no change to existing flows.

### Frontend changes

- `ShotResult` type gains `recommendedModel?: string` and `recommendedModelReason?: string` (both optional).
- `ResultsPanel` → `MainPromptHero`: renders the "Director's pick" strip when `recommendedModel` is present, resolved to its display label via `src/lib/models.ts` lookup.
- **"Use this model"** button calls a new `onSwitchModel?: (value: string) => void` prop lifted from `WorkflowPanel` → `Index`, which updates the `selectedModel` state the same way `ModelPicker` does. After switching, a toast nudges: "Model switched — click Generate to refine with the specialist."
- No auto-regeneration (user decides when to spend credits).

### Files touched

**Backend**
- `supabase/functions/generate-prompt/index.ts` — extend `shotSchema` with conditional `recommendedModel` + `recommendedModelReason` fields (added only when `targetModel === "any-model"`); enum list mirrors `src/lib/models.ts` values.
- `supabase/functions/generate-prompt/experts/generic.ts` — add Model Recommendation Protocol rubric to `systemAddendum` and a recommendation line to the `examples` block.

**Frontend**
- `src/components/ResultsPanel.tsx` — new "Director's pick" strip at the top of `MainPromptHero`; wire new optional `onSwitchModel` prop.
- `src/components/WorkflowPanel.tsx` — extend `ShotResult` type; accept & forward `onSwitchModel` prop from parent.
- `src/pages/Index.tsx` — pass `setSelectedModel` into `WorkflowPanel` as `onSwitchModel`.
- `src/i18n/translations/en.ts` + `src/i18n/translations/ar.ts` — keys: `results.directorPick`, `results.useThisModel`, `results.switchedToast`.

### Out of scope

- No recommendation for model-specific requests (Kling/Veo/Seedance/etc.) — user already chose.
- No automatic re-run after switching models — the user clicks Generate.
- No ML-based scoring, no telemetry on pick accuracy (can be added later).

### Verification

- Pick **Any Model**, upload a dialogue-heavy portrait → recommendation should be Veo 3.1 with a reason mentioning audio/dialogue.
- Pick **Any Model**, upload a product-on-turntable image with 3 element refs → recommendation should be Seedance 2.0.
- Pick **Any Model**, upload a dramatic landscape for a hero shot → recommendation should be Kling 3.0.
- Click **Use this model** → picker updates to the recommended value, toast shows, existing result stays visible until user hits Generate again.
- Verify in AR (RTL): strip border and button alignment flip correctly.
- Pick **Kling 3.0** (non-any) → no "Director's pick" strip appears.
