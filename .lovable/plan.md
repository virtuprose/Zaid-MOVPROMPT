## Goal

Add the **Kling 3.0** family to every layer that knows about video models, so the user can pick it in the UI and the Director agent can recommend/route to it.

Per fal.ai, Kling 3.0 ships in three tiers — all support **native audio** and multi-shot — endpoints already published:

| Tier | fal endpoint | Notes |
|---|---|---|
| Standard | `fal-ai/kling-video/v3/standard/text-to-video` | Default 1080p, audio, multi-shot |
| Pro | `fal-ai/kling-video/v3/pro/text-to-video` | Higher fidelity 1080p, audio, multi-shot |
| 4K | `fal-ai/kling-video/v3/4k/text-to-video` | Native 4K output in one step |

All three accept the same control surface as older Kling: standard aspect ratios (16:9, 9:16, 1:1), `cfg_scale`, and 5s or 10s duration. The new switch is audio support.

## Changes

### 1. `src/lib/director/videoModels.ts`
Add three entries at the top of the `Kuaishou — Kling` group, ahead of `kling-v2.5-turbo-pro`:

```ts
{ id: "kling-v3-pro", label: "Kling 3.0 Pro", family: "kling", note: "Newest, native audio, multi-shot" },
{ id: "kling-v3-standard", label: "Kling 3.0 Standard", family: "kling", note: "Native audio, multi-shot" },
{ id: "kling-v3-4k", label: "Kling 3.0 4K", family: "kling", note: "Native 4K output" },
```

Update `pickRecommendedModel` so version detection recognizes `"3"` / `"3.0"` for Kling. The existing regex `m.id.includes(\`v${v}\`)` already matches `kling-v3-*` for v=`3`, so no code change is needed beyond verifying.

### 2. `src/lib/director/videoModelCatalog.ts`
Add three `ModelCapabilities` entries at the top of the Kling section:

```ts
{ id: "kling-v3-pro", family: "kling", label: "Kling 3.0 Pro", note: "Newest, native audio, multi-shot",
  audio: true, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "balanced", cost: "high",
  strengths: ["cinematic", "photoreal", "complex_motion", "long_take", "dialogue"] },
{ id: "kling-v3-standard", family: "kling", label: "Kling 3.0 Standard", note: "Native audio, multi-shot",
  audio: true, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "fast", cost: "mid",
  strengths: ["cinematic", "photoreal", "dialogue"] },
{ id: "kling-v3-4k", family: "kling", label: "Kling 3.0 4K", note: "Native 4K, single-step",
  audio: true, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "slow", cost: "high",
  strengths: ["cinematic", "photoreal", "long_take"] },
```

Keep `maxResolution: "1080p"` for the 4K tier to avoid widening the `maxResolution` union type. The label + note convey "4K" to the user; ranking still treats it as top tier via `cost: "high"`.

### 3. `src/lib/director/videoModelControls.ts`
Pull the three Kling v3 ids OUT of the shared `Object.fromEntries(...)` loop (because they need `audio: true`, unlike legacy Kling). Add them as explicit entries:

```ts
"kling-v3-pro": {
  aspectRatios: STD_ASPECTS,
  durations: [5, 10],
  audio: true,
  cfgScale: true,
  defaults: { aspect_ratio: "16:9", duration: 5, audio: true, cfg_scale: 0.5 },
},
"kling-v3-standard": { /* same shape */ },
"kling-v3-4k": { /* same shape, default audio: true */ },
```

Legacy Kling entries stay in the existing shared loop unchanged.

### 4. `supabase/functions/generate-video/index.ts`
Add three rows to `MODEL_ENDPOINTS`:

```ts
"kling-v3-pro": "fal-ai/kling-video/v3/pro/text-to-video",
"kling-v3-standard": "fal-ai/kling-video/v3/standard/text-to-video",
"kling-v3-4k": "fal-ai/kling-video/v3/4k/text-to-video",
```

The family dispatch `case "kling"` already handles `aspect_ratio`, `duration`, and `cfg_scale`. Confirm that when `options.audio` is provided for kling v3 it is forwarded; if today's case strips it, add `if (audio !== undefined) input.audio = audio;` inside the `case "kling"` block (Pro/Standard/4K fal schemas accept `audio: boolean`).

### 5. `supabase/functions/director-agent/index.ts`
Add three lines at the top of `MODEL_CATALOG_LINES` (before the existing Kling entries) so the agent can recommend them:

```
"kling-v3-pro — kling, 10s, 1080p, AUDIO, cinematic+photoreal+complex_motion+long_take+dialogue+multi_shot",
"kling-v3-standard — kling, 10s, 1080p, AUDIO, cinematic+photoreal+dialogue+multi_shot",
"kling-v3-4k — kling, 10s, native_4K, AUDIO, cinematic+photoreal+long_take",
```

Redeploy the `director-agent` and `generate-video` edge functions after the edits.

### 6. Sanity
- Run the existing `src/lib/director/__tests__/modelRanking.test.ts`. It pins `kling-v2.5-turbo-pro` for an action scenario; with v3 added as `cost: high`, that test should still pass because v2.5-turbo-pro has `cost: mid` + `speed: fast` and the test scenario favors speed. If it fails, the smallest fix is to demote our new v3 tiers' implicit ranking by leaving them off the `strengths: ["action"]` list (already done — no `"action"` in the three new strength arrays).

## Out of scope

- New control fields (`negative_prompt`, custom-elements / lipsync options exposed by Kling v3). The existing kling shared schema already covers aspect/duration/cfg/audio, which is enough to ship the model.
- Image-to-video and frame-to-frame endpoints for Kling v3. Existing text-to-video route is sufficient for the Director's current flow.
- Showing "4K" as a real resolution chip in the controls dialog. Adding `"4k"` to the `maxResolution`/`resolutions` union touches more files than the user asked for; the note "Native 4K" communicates it.