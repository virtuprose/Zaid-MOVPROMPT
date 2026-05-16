## Root cause

Edge function logs are flooded with:
```
fal result response unreadable 404 {"detail":"Path /seedance/v1/pro/reference-to-video not found"}
```

The Marketing Studio sends `provider: "seedance-2.0-ref"` whenever a reference image (brand, character, or setting) is attached. In `supabase/functions/generate-video/index.ts` that maps to:
```ts
"seedance-2.0-ref": "fal-ai/bytedance/seedance/v1/pro/reference-to-video"
```
That fal.ai endpoint no longer exists — fal returns 404, so the job submits or polls but never produces a `video_url`. The user sees the spinner spin forever.

Per fal.ai docs (verified just now), the live endpoint is:
```
fal-ai/bytedance/seedance-2.0/reference-to-video
```

The legacy `seedance-v1-pro-ref` mapping in the same file points at the same dead endpoint and has the same problem.

## Fix

Edit `supabase/functions/generate-video/index.ts` `FAL_MODELS` map:

- `seedance-2.0-ref` → `fal-ai/bytedance/seedance-2.0/reference-to-video` (currently dead v1 path)
- `seedance-v1-pro-ref` → `fal-ai/bytedance/seedance-2.0/reference-to-video` (legacy alias; route old saved jobs to the live 2.0 endpoint since v1 ref is gone)

Nothing else in the function needs to change — the queue URL builder (`falAppNamespace` → first two path segments) already works for `fal-ai/bytedance/...` endpoints, and the `seedance` payload branch already sends `reference_image_urls` when the provider ends in `-ref`.

No frontend changes needed; `MarketingStudio.tsx` already picks `seedance-2.0-ref` when references are attached.

## Cleanup of stuck jobs

Existing `video_jobs` rows from before the fix that are stuck in `queued`/`processing` will never complete. Two options — recommend (a):

a) **Mark old stuck jobs as failed** so they disappear from "Pending" with a clear message. One small data update:
   ```sql
   update video_jobs
   set status = 'failed',
       error = 'Provider endpoint changed — please retry',
       completed_at = now()
   where status in ('queued','processing')
     and provider in ('seedance-2.0-ref','seedance-v1-pro-ref')
     and created_at < now();
   ```
b) Leave them alone (they'll stay spinning until the 24h `since` filter on the Marketing Studio fetch drops them).

## Verification

1. Open Marketing Studio with a brand kit / character that has a reference image attached.
2. Generate — expect the new job to submit successfully (no 404 in edge logs) and complete in ~1–3 min.
3. Check `edge-function-logs-generate-video` for the absence of the `Path /seedance/v1/pro/reference-to-video not found` warning.