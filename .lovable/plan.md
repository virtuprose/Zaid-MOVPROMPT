## Goal

Add Seedance 2.0 (full + Fast) and Veo 3.1 (full + Fast + Lite) to the Director's "Generate video" picker so users can render with the latest models from both families.

## What's available on fal.ai

Confirmed via fal.ai docs:

- `bytedance/seedance-2.0/text-to-video` — full quality, native audio, multi-shot
- `bytedance/seedance-2.0/fast/text-to-video` — faster / cheaper variant
- `fal-ai/veo3.1` — Google Veo 3.1 with sound
- `fal-ai/veo3.1/fast` — faster variant of Veo 3.1
- `fal-ai/veo3.1/lite` — lightweight, cost-effective variant

Note on the existing `fal-ai/veo3` IDs: the live fal endpoints are `fal-ai/veo3` and `fal-ai/veo3/fast`. We will keep them but reorder so Veo 3.1 sits above Veo 3 in the dropdown.

## Files to touch

### 1. `src/lib/director/videoModels.ts` (frontend registry)

Update the Veo and Seedance groups so the picker shows the new entries first:

```text
Google — Veo
  veo-3.1            Veo 3.1                (note: "Latest, native audio")
  veo-3.1-fast       Veo 3.1 Fast
  veo-3.1-lite       Veo 3.1 Lite           (note: "Faster, lower cost")
  veo-3              Veo 3
  veo-3-fast         Veo 3 Fast
  veo-2              Veo 2

ByteDance — Seedance
  seedance-2.0       Seedance 2.0           (note: "Cinematic, native audio")
  seedance-2.0-fast  Seedance 2.0 Fast
  seedance-v1-pro    Seedance 1 Pro
  seedance-v1-lite   Seedance 1 Lite
```

Also update `pickRecommendedModel` so a recommendation string like "Veo 3.1" or "Seedance 2.0" maps to the new top entry instead of falling through to the older Veo 3 / Seedance 1.

### 2. `supabase/functions/generate-video/index.ts` (FAL_MODELS map)

Add the matching entries (keep the existing ones intact so saved jobs still resolve):

```ts
// Veo
"veo-3.1":         "fal-ai/veo3.1",
"veo-3.1-fast":    "fal-ai/veo3.1/fast",
"veo-3.1-lite":    "fal-ai/veo3.1/lite",
// Seedance
"seedance-2.0":      "bytedance/seedance-2.0/text-to-video",
"seedance-2.0-fast": "bytedance/seedance-2.0/fast/text-to-video",
```

The existing submit/poll flow already POSTs `{ prompt }` to `https://queue.fal.run/${model}` and polls `…/requests/${id}/status`, which works for all five new endpoints — no other backend changes required.

### 3. Optional: prompt-expert hint

The Veo expert in `supabase/functions/generate-prompt/experts/veo.ts` already mentions 3.1 — no edit required. The Seedance expert (`experts/seedance.ts`) currently targets v1; we can update its `matches` predicate to also cover `seedance-2`, but this is a follow-up and not blocking the picker change.

## Out of scope

- Image-to-video and reference-to-video endpoints (Seedance 2.0 has both, Veo 3.1 has image-to-video and first-last-frame). The current Director only does text-to-video; adding I2V is a separate flow.
- Per-model parameter UIs (`duration`, `resolution`, `generate_audio`, `aspect_ratio`). Today we send `{ prompt }` only; exposing controls is a separate UX task.
- Changing the legacy `seedance` / `veo` / `kling` aliases.

## Verification

After the edit, the dropdown on every result card shows Veo 3.1 / 3.1 Fast / 3.1 Lite at the top of Google and Seedance 2.0 / 2.0 Fast at the top of ByteDance. Picking any of them creates a `video_jobs` row, fal accepts the request, and polling completes with an MP4 URL.
