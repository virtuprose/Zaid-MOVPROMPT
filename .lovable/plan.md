# AI Director Agent — Plan

A new top-level tool at **`/director`** that acts as a creative director: the user dumps a brief (any combination of text, images, video, audio, PDF/docs), the agent extracts intent in **one shot**, asks clarifying questions only when truly ambiguous, then produces a polished cinematic prompt ready for any video model.

Built so video generation can plug in later without re-architecting.

---

## 1. UX flow

```text
/director
┌─────────────────────────────────────────────────────────┐
│  AI Director                              [Save] [New]  │
├─────────────────────────────────────────────────────────┤
│  Brief (chat-style, single thread)                      │
│                                                         │
│  ┌─ Drop zone ──────────────────────────────────────┐  │
│  │  Drag images, video, audio, PDF, or .docx here   │  │
│  │  + paste text  + record voice                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Attached] sunset.jpg · ref.mp4 · brief.pdf           │
│                                                         │
│  Textarea: "What are we making?" [Direct →]            │
└─────────────────────────────────────────────────────────┘

After submit:
  → Agent ingests everything in parallel
  → If brief is complete: produces final prompt directly
  → If gaps remain: asks 1–3 targeted questions inline
     (camera/lens · mood · subject action · duration)
  → Final output card: prompt + breakdown + "Copy" + "Save to library"
                      + (disabled, "Coming soon") "Generate video"
```

Smart one-shot rule: the agent only asks when a missing field would meaningfully change the output. Never more than 3 follow-ups.

---

## 2. Inputs & ingestion

| Input | Handling |
|---|---|
| Text | Sent as user message |
| Images (jpg/png/webp) | Uploaded to `generation-images` bucket → passed as image URLs to `gemini-2.5-flash` (vision) for style/composition extraction |
| Video (mp4/mov, ≤25MB) | Uploaded to a new `director-uploads` bucket → server extracts 4 keyframes via ffmpeg in edge function → frames sent to vision model for motion/pacing analysis |
| Audio (m4a/mp3/wav, voice brief) | Uploaded → transcribed via Lovable AI (gemini-2.5-flash supports audio) → text appended to brief |
| PDF / DOCX | Parsed client-side (pdf.js for PDF, mammoth for docx) → text extracted → first 3 embedded images extracted and treated as references |

All ingestion produces a normalized `BriefContext` object sent to the agent.

---

## 3. Agent architecture

Single edge function: `supabase/functions/director-agent/index.ts`

- Uses Lovable AI Gateway, model `google/gemini-2.5-pro` (best multimodal reasoning for this).
- **Tool-calling** for structured output — three tools:
  1. `ask_clarification` — returns 1–3 questions when brief is incomplete
  2. `generate_prompt` — returns final cinematic prompt + scene breakdown (subject, camera, lens, lighting, mood, motion, duration_hint)
  3. `request_video_generation` — **stub now**, wired to UI but returns `{status: "coming_soon"}`. This is the seam for future video gen.
- System prompt instructs Director persona: ask only when ambiguous, prefer one-shot.
- Maintains a session-scoped conversation array (in component state, not persisted unless user saves).

---

## 4. Database

New table `director_sessions`:
- `id uuid pk`, `user_id uuid`, `title text`, `brief_context jsonb`, `messages jsonb`, `final_prompt text nullable`, `created_at`, `updated_at`
- RLS: user can CRUD own rows.

New storage bucket `director-uploads` (private), RLS: user can read/write own folder `{user_id}/...`.

Reuses existing `prompt_history` table when user clicks "Save to library".

---

## 5. Video generation seam (designed, not built)

- `request_video_generation` tool exists but returns "coming_soon"
- UI shows the button, disabled with tooltip "Video generation arrives in a future update"
- Future provider abstraction file `src/lib/videoProviders.ts` with interface `{ generate(prompt, refs, opts): Promise<VideoJob> }` — empty implementations for Seedance / Veo / Kling so we can drop in API keys later
- DB column `video_job_id` reserved on `director_sessions` from day one to avoid migration churn

---

## 6. Files to create

**Frontend**
- `src/pages/Director.tsx` — page shell, route registered in `App.tsx`
- `src/components/director/DirectorChat.tsx` — message thread + input
- `src/components/director/AttachmentDropzone.tsx` — multi-format drop zone
- `src/components/director/AttachmentChip.tsx` — preview chips
- `src/components/director/PromptResultCard.tsx` — final output + actions
- `src/lib/director/ingest.ts` — client-side parsing (PDF/DOCX/audio recording)
- `src/lib/director/api.ts` — calls edge function
- `src/lib/videoProviders.ts` — future seam

**Backend**
- `supabase/functions/director-agent/index.ts`
- `supabase/functions/director-extract-frames/index.ts` — ffmpeg keyframes from video
- Migration: `director_sessions` table + `director-uploads` bucket + RLS

**Nav**
- Add "Director" entry to top nav + mobile hamburger (badge: "New")

---

## 7. Out of scope (this plan)

- Actual video model integration (deferred — the plug points are ready)
- Real-time streaming of agent responses (v2; v1 uses request/response)
- Multi-user collaboration on a session

---

## Open questions before I build

1. **Director persona voice** — terse pro DP ("Shot on Arri Alexa, 35mm, golden hour…") or warmer collaborator tone?
2. **Save behavior** — auto-save every session, or only on explicit "Save"?
3. **Free vs paid gating** — should Director be a paid-tier feature or available to all users?

I'll wait for answers (or you can say "your call") before implementing.
