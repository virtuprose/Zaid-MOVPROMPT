# Stop the "provider completed but did not return video" toast on refresh

## Root cause

On mount, `MarketingStudio` loads any `queued`/`processing` `video_jobs` from the DB and starts polling them. Old jobs submitted before the Seedance endpoint fix have a fal `request_id` registered against a 404 path — the next poll marks them `failed` and fires `toast.error(updated.error)`, which the user sees on every refresh as long as a stuck job exists.

## Fix in `src/pages/MarketingStudio.tsx`

1. **Track which jobs the user started in this session.** Add a ref `sessionJobIdsRef = useRef<Set<string>>(new Set())`. Add the job id when `startGenerate` succeeds.
2. **Suppress error toast for resumed jobs.** In the polling effect (lines 374–378), only call `toast.error(updated.error || "Render failed")` when `sessionJobIdsRef.current.has(job.id)`. For resumed jobs, silently remove them from `pendingJobs` — the success path keeps its toast.
3. **Drop the noisy "Resuming N renders in progress…" message** at line 179 — it adds nothing and reinforces the impression of a problem. Just load the jobs silently.

## Fix in `supabase/functions/generate-video/index.ts`

4. **Mark jobs failed on status 404 too**, not just result 404. Around lines 283–293, when `fal.queue.status` throws and `extractFalError(error).status === 404`, write the same `failed` row to `video_jobs` and return it. Otherwise the job stays `queued`/`processing` forever and gets re-polled on every refresh.

## One-time DB cleanup

5. Run a migration that marks any currently-stuck rows as failed so they stop being resumed:
   ```sql
   update public.video_jobs
   set status = 'failed',
       error = coalesce(error, 'Stuck job auto-cleaned'),
       completed_at = now()
   where status in ('queued','processing')
     and created_at < now() - interval '10 minutes';
   ```

## Out of scope

- Endpoint mapping (already fixed previously).
- Generate-button flow, prompt composition, UI layout — unchanged.
- No schema changes.
