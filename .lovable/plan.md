# AI Director — Production Hardening

Six upgrades to take the Director from MVP to production-solid. Each is independently shippable; recommended order below.

## 1. Session persistence

Today: chat lives only in component state. Refresh = lost.

**DB:** new tables
- `director_sessions` — `id, user_id, title, created_at, updated_at`
- `director_messages` — `id, session_id, role, content, attachments jsonb, result jsonb, created_at`

RLS: owner-only via `auth.uid() = user_id` on sessions; messages joined through session.

**UI:**
- Left rail on `/director` listing recent sessions (title from `generate_prompt.title`, fallback "Untitled brief").
- New "+" button starts a fresh session.
- `DirectorChat` loads/saves messages by `sessionId` (URL: `/director/:sessionId`).
- Auto-create a session on first user message; auto-title from the first prompt result.

## 2. Signed-URL image uploads (replace data URLs)

Today: 4 MB images are inlined as base64 → 33% bloat, single request can hit 40 MB.

**Change:**
- `ingestImage` and `ingestVideo` upload originals/keyframes to the existing `director-uploads` bucket under `{userId}/{sessionId}/{ts}-{name}`.
- Return `{ kind, name, url }` where `url` is a **signed URL** (1 hr TTL) created via `supabase.storage.from('director-uploads').createSignedUrl(path, 3600)`.
- Edge function already accepts `url` — no server change needed beyond confirming the AI Gateway can fetch signed URLs (it can; they are plain HTTPS).
- Add a cleanup edge function `director-cleanup` invoked nightly (or on session delete) to purge orphan files older than 7 days.

## 3. Real audio transcription

Today: audio uploads but the model only sees a placeholder string.

**Change:**
- New edge function `transcribe-audio` that downloads the uploaded file from `director-uploads` and calls **Lovable AI Gateway** with `google/gemini-2.5-flash` as a multimodal request (audio input → text). No external Whisper key needed.
- `ingestAudio` uploads the file, calls `transcribe-audio`, and returns `{ kind: "audio_transcript", name, text: <real transcript> }`.
- Show a "Transcribing…" chip in the composer while it runs; fail-soft to placeholder if transcription errors.

## 4. Streaming responses

Today: single blocking request; user stares at a spinner for ~5–15 s on `gemini-3.1-pro-preview`.

**Change:**
- Switch `director-agent` to `stream: true`, return the gateway's SSE body directly with `Content-Type: text/event-stream`.
- Frontend uses the line-by-line SSE parser pattern (per the AI Gateway streaming guide).
- Streaming + tool calls: accumulate `tool_calls[0].function.arguments` deltas as they arrive; once `[DONE]`, parse the assembled JSON and dispatch to `PromptResultCard` / clarification UI.
- Show a skeleton card that progressively fills as fields arrive (title → prompt → breakdown → director's note).

## 5. Ship real video generation (or remove the seam)

Today: `request_video_generation` returns "coming soon". `FAL_KEY` secret is already configured.

**Change:** wire it up.
- New edge function `generate-video` — accepts `{ prompt, provider, aspect_ratio, duration }`, calls fal.ai (`fal-ai/seedance/v1/pro`, `fal-ai/veo3`, or `fal-ai/kling-video/v2`) with the user's prompt.
- Returns a job id; poll for completion (fal exposes a queue API).
- New table `video_jobs` — `id, user_id, session_id, message_id, provider, prompt, status, video_url, error, created_at, completed_at`. RLS owner-only.
- `PromptResultCard` gets a "Generate this video" button → calls the function → shows progress + final `<video>` player when done.
- `request_video_generation` tool in the agent now triggers this flow instead of returning the placeholder.

## 6. Retry, backoff, and dynamic model list

- Wrap the AI Gateway call in a 2-attempt retry with 500 ms / 1.5 s backoff for 5xx and transient network errors. Never retry on 402/429 — surface those directly.
- Move the hard-coded `Seedance Pro / Veo 3 / Kling 2` list out of the system prompt into a constant injected at request time, so adding a new provider only requires updating one array.

## Out of scope (intentionally)

- **Distributed rate limiting** — backend doesn't have proper primitives yet; keep the existing in-memory limiter as best-effort.
- Multi-user collaboration on a session.
- Versioning/branching of prompt results inside a session (can be added later via `parent_message_id`).

## Technical details

**Migrations:** 2 new tables (`director_sessions`, `director_messages`, `video_jobs`) with RLS policies using `auth.uid() = user_id`. No triggers needed; `updated_at` maintained by client on write.

**Edge functions to add:** `transcribe-audio`, `generate-video`, `director-cleanup`. Modify: `director-agent` (streaming + retry + dynamic providers).

**Files touched (frontend):**
- `src/lib/director/ingest.ts` — uploads + signed URLs + transcription call
- `src/lib/director/api.ts` — SSE streaming client
- `src/pages/Director.tsx` — session routing + sidebar
- `src/components/director/DirectorChat.tsx` — load/save by session, progressive rendering
- `src/components/director/PromptResultCard.tsx` — "Generate video" CTA + job polling

**Recommended ship order:** 1 (persistence) → 2 (signed URLs) → 4 (streaming) → 3 (transcription) → 5 (video gen) → 6 (retries). Each PR independently testable.
