## Goal

Scope generated videos to where they were made:

- **AI Director** chat: videos generated from a Director session render inline in that chat (and only that chat).
- **Marketing Studio** "Your Recent Ads": only ads generated from Marketing Studio.
- **Library**: continues to show everything (no change).

## Why this works cleanly

`video_jobs.session_id` already encodes the origin:

- Director jobs are inserted with `session_id = director_sessions.id` (a uuid).
- Marketing Studio jobs are inserted with `session_id = null` (see `MarketingStudio.tsx` → `submitVideoJob(prompt, provider, null, …)`).

So the routing is already there in data — the UI just isn't honoring it.

## Changes

### 1. `src/pages/MarketingStudio.tsx` — keep Ads grid ads-only

In the "Your Recent Ads" loader (around lines 156–180), add `.is("session_id", null)` to both queries (completed `done` + in-flight `active`) so Director renders no longer leak into Recent Ads.

### 2. `src/components/director/DirectorChat.tsx` — render videos inside the panel

Add a new bubble variant:

```ts
| { role: "video"; jobId: string; prompt: string; provider: string;
    status: "queued" | "processing" | "completed" | "failed";
    videoUrl?: string; error?: string }
```

In the `request_video_generation` branch (lines 381–408), after `submitVideoJob(...)` succeeds, append a `video` bubble to `bubbles` with the returned job id and `status: "queued"`. Replace the current "check your Library" toast with a softer "Rendering — it'll appear here when ready" toast.

Add a lightweight effect that, for every `video` bubble in `bubbles` whose status is `queued`/`processing`, polls `pollVideoJob(jobId)` every ~4s until `completed` or `failed`, updates that bubble in place (and persists via the existing `persist()` path so it survives reload).

On session load (the `routeSessionId` effect around lines 123–144), also fetch any `video_jobs` rows where `session_id = routeSessionId` that aren't already represented as bubbles, and append them as `video` bubbles. This covers videos that finished while the user was away.

### 3. New `src/components/director/VideoBubble.tsx`

Small presentational card matching the dark cinematic theme:

- Queued/processing: shimmer placeholder with status pill + prompt preview.
- Completed: autoplay-muted-loop `<video>` with controls on hover, "Open in Library" link, like button.
- Failed: error card with retry hint.

Rendered from the bubble loop in `DirectorChat.tsx` next to the other bubble renderers.

### 4. `src/components/library/VideosTab.tsx`

No code change. It already shows all user videos and labels them "AI Director" vs "Studio" based on `session_id`.

## Out of scope

- No schema changes — `video_jobs.session_id` already supports this.
- No changes to `submitVideoJob` callers' arguments.
- No changes to RLS.

## Files touched

- `src/pages/MarketingStudio.tsx` — two query filters added.
- `src/components/director/DirectorChat.tsx` — new bubble variant, poller, session-load merge, render hook.
- `src/components/director/VideoBubble.tsx` — new file.