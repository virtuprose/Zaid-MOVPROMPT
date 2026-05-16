## Goal
Make in-flight ad renders survive page refresh on `/marketing`, and show clearer in-progress UI.

## Why it breaks today
`MarketingStudio.tsx` initial load only fetches jobs with a `video_url` (completed). Queued/processing jobs from `video_jobs` are not re-hydrated, so the "Generating…" tile vanishes on refresh even though the job is still running server-side on fal.ai.

## Changes

### 1. Hydrate pending jobs on mount (`src/pages/MarketingStudio.tsx`)
Replace the single completed-only query with two parallel reads:
- Completed (current query) → `userAds`
- Active: `status in ('queued','processing')` from the last ~24h → `pendingJobs`

```ts
const [{ data: done }, { data: active }] = await Promise.all([
  supabase.from("video_jobs")
    .select("id,video_url,created_at")
    .eq("user_id", user.id).not("video_url","is",null)
    .order("created_at",{ascending:false}).limit(24),
  supabase.from("video_jobs")
    .select("id,status,provider,prompt,created_at")
    .eq("user_id", user.id)
    .in("status", ["queued","processing"])
    .gte("created_at", new Date(Date.now()-24*3600*1000).toISOString())
    .order("created_at",{ascending:false}),
]);
```

The existing polling `useEffect` (line 329) will then pick them up automatically and move them to `userAds` when fal returns the URL.

### 2. Surface progress in the gallery
Render `pendingJobs` as skeleton tiles above `userAds` with a spinner + "Rendering… ~1–3 min" label, so users know what's in flight after a refresh.

### 3. (Optional) Toast on rehydrate
If `pendingJobs.length > 0` after mount: `toast.message("Resuming N render(s) in progress…")`.

## Not in scope
- No edge function changes — `generate-video` already submits to fal and stores `fal_request_id`, and `pollVideoJob` already calls fal status on demand. Nothing server-side needs to change.
- No queue/worker rework (the fal queue already plays that role).
- No change to the "describe" auto-writer.

## Files touched
- `src/pages/MarketingStudio.tsx` — hydrate query, render pending tiles.

## Validation
1. Start a render → refresh page → pending tile reappears, polling resumes, completes into gallery.
2. Old completed renders still appear in `userAds`.
3. Jobs older than 24h that never finished are ignored (avoid zombie spinners).
