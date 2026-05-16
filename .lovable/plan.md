## Root cause
In `supabase/functions/generate-video/index.ts`, `getLegacyFalUrls()` builds:
```
queue.fal.run/{full-model-path}/requests/{id}/status|response
```
But fal's queue API is rooted at the **app namespace**, not the model variant. So `fal-ai/bytedance/seedance-2.0/text-to-video/requests/{id}/response` 404s; the correct URL is `fal-ai/bytedance/requests/{id}` (or `/status`). Jobs that were submitted before `fal_status_url`/`fal_response_url` were captured fall through to this broken fallback and never resolve, so the UI spins forever.

## Fix

### 1. `supabase/functions/generate-video/index.ts` — correct the legacy URL builder
Reduce the model path to the fal app namespace before building request URLs.

```ts
function falAppNamespace(model: string): string {
  // model examples:
  //   "fal-ai/bytedance/seedance-2.0/text-to-video"   -> "fal-ai/bytedance"
  //   "fal-ai/bytedance/seedance/v1/pro/text-to-video" -> "fal-ai/bytedance"
  //   "fal-ai/kling-video/v3/pro/text-to-video"       -> "fal-ai/kling-video"
  //   "fal-ai/veo3.1"                                  -> "fal-ai/veo3.1"
  //   "fal-ai/veo3/fast"                               -> "fal-ai/veo3"
  //   "fal-ai/minimax/hailuo-02/pro/text-to-video"    -> "fal-ai/minimax"
  //   "fal-ai/runway-gen3/turbo/text-to-video"        -> "fal-ai/runway-gen3"
  //   "fal-ai/ltx-video-13b-distilled"                 -> "fal-ai/ltx-video-13b-distilled"
  //   "fal-ai/wan-pro/text-to-video"                   -> "fal-ai/wan-pro"
  //   "fal-ai/wan/v2.2-a14b/text-to-video"            -> "fal-ai/wan"
  const parts = model.split("/");
  // Always at least "fal-ai/<name>"; keep only the first two segments.
  return parts.slice(0, 2).join("/");
}

function getLegacyFalUrls(_provider: string, model: string, requestId: string) {
  const base = falAppNamespace(model);
  return {
    statusUrl: `https://queue.fal.run/${base}/requests/${requestId}/status`,
    responseUrl: `https://queue.fal.run/${base}/requests/${requestId}`,
  };
}
```

Two changes vs current code:
- Use namespace, not full model path.
- Drop the `/response` suffix (fal returns the result at `/requests/{id}` directly).

### 2. Heal stuck rows
For existing rows where `fal_status_url` / `fal_response_url` are NULL but `fal_request_id` is set, the corrected fallback now resolves them on the next poll — no migration needed.

## Not in scope
- No client changes.
- No new queue/worker. The fal queue + edge-function polling already work.
- No change to submit path (already uses returned `status_url`/`response_url` going forward).

## Validation
- Watch existing in-flight job (provider `seedance-2.0`) — next poll should return `COMPLETED` and video URL populates.
- Logs should no longer show `Path /…/text-to-video not found`.

## Files touched
- `supabase/functions/generate-video/index.ts`
