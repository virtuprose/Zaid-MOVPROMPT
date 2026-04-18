

# Model-First Generation Flow

Flip the order: pick the AI model first, then the upload UI adapts to that model's native input contract. Remove the 3 workflow tabs. Variant-aware for Kling/Seedance/Veo specialists; sensible defaults for everyone else.

## New flow

```text
1. Pick target model (Kling 3.0 Omni Edit, Seedance 2.0, Veo 3.1, ...)
        ↓
2. App shows that model's input contract:
     - slot count (1, 2, or "concept")
     - slot labels (Source / Start frame / End frame / Reference / etc.)
     - extras hint (audio ref, waypoints, transformation note...)
        ↓
3. User uploads the right images for that model
        ↓
4. Optional: Analyze scene
        ↓
5. Configure (description + presets) → Generate
```

## Per-model input contracts (v1)

A single config table `MODEL_INPUT_CONTRACTS` maps each model value → contract:

| Family / Variant | Slots | Slot labels | Extras hint shown to user |
|---|---|---|---|
| **Kling Standard** (3.0, 3.0 Omni, 2.6) | 1 | "Reference image" | — |
| **Kling Edit** (3.0 Omni Edit, O1 Video Edit) | 1 | "Source image to transform" | "Describe ONLY the change you want" |
| **Kling Motion Control** (motion-control, 3.0-motion-control) | 1 | "Subject image" | "We'll generate a 3-waypoint camera path" |
| **Kling O1 Video** | 1 | "Reference image" | — |
| **Seedance 2.0 / Pro / 1.5 Pro** | 1 or 2 (toggle) | "Single frame" OR "Start frame" + "End frame" | "Audio is auto-generated (2.0 only)" |
| **Seedance Fast variants** | 1 | "Reference image" | — |
| **Veo 3.1 / 3.1 Fast / 3.1 Lite** | 1 | "Reference image" | "Native synced audio will be generated" |
| **Veo 3 / 3 Fast** | 1 | "Reference image" | — |
| **Sora 2 family** | 1 | "Reference image" | — |
| **Hailuo, Wan, Higgsfield, Grok, Grok Edit** | 1 | "Reference image" (Edit → "Source image") | Edit variants get the transformation hint |
| **Multi-shot / storyboard** (any model that supports it) | 1 | "Concept frame" | "We'll generate a multi-shot sequence" |

Seedance "1 vs 2 frames" is the only model that needs a runtime toggle inside its contract — everyone else has a fixed slot count.

## UI changes

**`src/pages/Index.tsx`**
- Remove the 3 `TabsList` workflow tabs and `WORKFLOWS` array
- Replace with a single centered `ModelPicker` card at the top of the generation area (uses the existing `MODEL_GROUPS` from `ConfigPanel.tsx`, lifted into a shared file)
- Below it, render `<WorkflowPanel selectedModel={model} />` (no more `type` prop)

**`src/components/WorkflowPanel.tsx`**
- Drop the `type: WorkflowType` prop, derive everything from `selectedModel`
- New helper `getContract(model)` returns `{ slots, labels, extras, supportsTwoFrameToggle }`
- Render slot count from contract; if `supportsTwoFrameToggle` (Seedance non-Fast), show a small "Single frame / Start + End" toggle
- Show the contract's `extras` hint as a small info chip above the upload zones
- Move `ConfigPanel` so that **only the description + presets** show post-upload — the model dropdown moves out of `ConfigPanel` since it's now picked first

**`src/components/ConfigPanel.tsx`**
- Extract `MODEL_GROUPS` to `src/lib/models.ts` (shared)
- Remove the model `Select` from this component; keep only description + preset chips
- Update props to drop `model` / `onModelChange`

**New file `src/components/ModelPicker.tsx`**
- Compact card with grouped `Select` (same `MODEL_GROUPS`) styled as the primary entry point
- Shows a one-line description of the picked model below it (e.g. "Edit variant — describe only the transformation")

**New file `src/lib/modelContracts.ts`**
- Exports `getContract(model: string): ModelContract` and the `ModelContract` type
- Small pure function, easy to extend later

## Edge function

No backend changes needed. `workflowType` already gets sent to `generate-prompt`; we'll derive it from the contract:
- 2-slot Seedance → `"twoframe"`
- "Concept" multi-shot picks → `"multishot"`
- Everything else → `"single"`

Existing variant-aware Kling routing keeps working as-is.

## Translations

Add ~10 new EN/AR keys for slot labels, extras hints, and the model-picker title. All other copy stays.

## Files touched

**New:** `src/lib/modelContracts.ts`, `src/lib/models.ts`, `src/components/ModelPicker.tsx`
**Modified:** `src/pages/Index.tsx`, `src/components/WorkflowPanel.tsx`, `src/components/ConfigPanel.tsx`, `src/i18n/translations/en.ts`, `src/i18n/translations/ar.ts`

## Out of scope (can follow up)

- Audio file upload slot for Seedance 2.0 (just a hint for now, no actual audio reference upload)
- Waypoint editor for Motion Control variants (just a hint for now)
- Per-model preset chip filtering (e.g. hide "audio" presets for silent Kling)

