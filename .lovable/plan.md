# Per-model video options before generation

## Goal

When the user clicks **Generate video** and picks a model, instead of submitting immediately, open a small **"Render settings"** dialog showing only the controls that the chosen model actually supports. After they confirm, submit the job with those options.

Each model family on fal.ai exposes a different set of inputs. We tailor the form to that model.

## Per-model control matrix

| Model family | Aspect ratio | Duration | Resolution / Quality | Audio | Other |
|---|---|---|---|---|---|
| Veo 3.1 / 3.1 Fast | 16:9, 9:16, 1:1 | 4s, 6s, 8s | 720p, 1080p | on / off (native audio) | — |
| Veo 3.1 Lite / Veo 3 / Veo 3 Fast | 16:9, 9:16 | 8s | 720p, 1080p | on / off | — |
| Veo 2 | 16:9, 9:16 | 5s, 6s, 7s, 8s | 720p | — (no audio) | — |
| Kling 2.5 Turbo Pro / 2.1 Master / 2 Master | 16:9, 9:16, 1:1 | 5s, 10s | — | — | cfg_scale slider (0.1–1) |
| Kling 1.6 Pro / 1.5 Pro / 1.6 Std / 1.0 Pro / 1.0 Std | 16:9, 9:16, 1:1 | 5s, 10s | — | — | cfg_scale |
| Seedance 2.0 / 2.0 Fast | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 5s, 10s | 480p, 720p, 1080p | on / off (native audio) | — |
| Seedance 1 Pro / 1 Lite | same aspects | 5s, 10s | 480p, 720p, 1080p | — | — |
| Hailuo 02 Pro | 16:9 | 6s, 10s | 768p, 1080p | — | prompt_optimizer toggle |
| Hailuo 02 Standard / 01 | 16:9 | 6s | 768p | — | — |
| Runway Gen-3 Turbo | 16:9, 9:16 | 5s, 10s | — | — | — |
| LTX Video / 13B | 16:9, 9:16, 1:1 | 5s | — | — | — |
| Wan Pro / 2.2 A14B | 16:9, 9:16, 1:1 | 5s, 10s | 480p, 720p | — | — |

(Defaults: 16:9, lowest duration option, highest resolution available, audio on when supported.)

## What to build

### 1. New file: `src/lib/director/videoModelControls.ts`

Declares a `getModelControls(modelId)` returning the schema for that model:

```ts
type ModelControls = {
  aspectRatios?: string[];        // e.g. ["16:9","9:16","1:1"]
  durations?: number[];            // seconds
  resolutions?: string[];          // ["720p","1080p"]
  audio?: boolean;                 // show audio toggle
  cfgScale?: boolean;              // show cfg slider (Kling)
  promptOptimizer?: boolean;       // Hailuo
  defaults: { aspect_ratio?: string; duration?: number; resolution?: string; audio?: boolean; cfg_scale?: number; prompt_optimizer?: boolean };
};
```

Encodes the matrix above keyed by model id, plus a small fallback for unknown models (16:9 only).

### 2. New file: `src/components/director/VideoOptionsDialog.tsx`

Small shadcn `Dialog` rendered from `PromptResultCard`. Props: `open`, `model`, `onCancel`, `onConfirm(options)`. Renders only the controls returned by `getModelControls(model.id)`:

- Aspect ratio → button group / `ToggleGroup`
- Duration → segmented buttons
- Resolution → segmented buttons
- Audio → `Switch`
- cfg_scale → `Slider` 0.1–1, default 0.5
- prompt_optimizer → `Switch`

Confirm button label: "Render with {model.label}".

### 3. Update `PromptResultCard.tsx`

- Replace direct `generateVideo(modelId)` from the dropdown with a two-step flow: clicking a model in the dropdown sets `pendingModel` and opens `VideoOptionsDialog`. Confirming the dialog calls `generateVideo(modelId, options)`.
- `generateVideo` now passes `options` through to `submitVideoJob`.

### 4. Update `src/lib/director/api.ts`

- Add `VideoOptions` type matching the union of fields above.
- `submitVideoJob(prompt, provider, sessionId, options?)` includes `options` in the request body.

### 5. Update `supabase/functions/generate-video/index.ts`

- Accept `options` from the request body. Build the fal payload starting from `{ prompt }` and merge model-appropriate fields:
  - Veo: `aspect_ratio`, `duration`, `resolution`, `generate_audio`
  - Kling: `aspect_ratio`, `duration`, `cfg_scale`
  - Seedance: `aspect_ratio`, `duration`, `resolution`, `generate_audio`
  - Hailuo: `duration`, `resolution`, `prompt_optimizer`
  - Runway: `aspect_ratio`, `duration`
  - LTX: `aspect_ratio`
  - Wan: `aspect_ratio`, `duration`, `resolution`
- A small `buildFalPayload(provider, prompt, options)` helper keeps this isolated. Unknown fields are dropped — never forwarded to fal.

No DB migration needed (the options are just forwarded to fal; we already store `prompt` and `provider`).

## Out of scope

- No changes to the AI Director's chat conversation itself — the questions are asked via a focused settings dialog rather than free-form chat (faster, less error-prone, and won't burn AI credits).
- No new auth, analytics or tour additions.
