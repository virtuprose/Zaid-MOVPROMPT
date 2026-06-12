## Goal

Make the AI Director feel like it never forgets — within a single chat AND across days — without ever hitting a "too many messages" wall again.

Today the agent silently trims to the last 30 messages. That stops the error, but the Director loses earlier context (what was uploaded, decisions made, the locked spec). We'll replace the dumb slice with a **rolling summary** per session, and add a lightweight **long-term user memory** so the Director remembers you across sessions.

## What changes for the user

- No "too many messages" error, ever.
- In a long chat, the Director still remembers what happened on message 1 — uploads, story beats, locked style, characters.
- When you start a new chat later (next day, next week), the Director recalls: who you are, the characters/brands/locations you've pinned, your style preferences, and a one-line recap of recent sessions.
- You can view and clear this memory from Account → Preferences.

## Architecture

```text
Each request to director-agent:
  ┌─────────────────────────────────────────────┐
  │ SYSTEM PROMPT                               │
  │ + LONG-TERM USER MEMORY  (cross-session)    │  ← new
  │ + SESSION SUMMARY        (rolling, this chat)│  ← new
  │ + RECENT MESSAGES        (last ~20 turns)   │  ← was 30, raw
  │ + SESSION STATE RECAP    (already exists)   │
  │ + Current user turn                         │
  └─────────────────────────────────────────────┘
```

### 1. Rolling session summary (within one chat)

- Add a `summary` field on `director_sessions.brief_context` (column already exists as jsonb).
- When a session crosses ~20 messages, the edge function asynchronously condenses the *oldest* messages into a structured summary: pinned subjects, uploaded image URLs + captions, locked spec (model/aspect/duration/style), story beats, key decisions, last clarification answered.
- Next request: instead of slicing raw messages, we send `summary + last ~20 raw messages`. The Director sees the whole story compactly.
- Summary is regenerated incrementally (only the new "to-be-evicted" turns get folded in, not the whole chat each time) so cost stays low.

### 2. Long-term user memory (across chats)

- New table `director_user_memory` (one row per user) holding a compact JSON profile:
  - pinned characters / brands / products the user has reused
  - recurring style preferences (cinematic look, aspect, audio)
  - recently used models
  - a short list of "recent sessions" (id, title, 1-line recap)
- Updated at the end of each session (debounced) by a small summarizer call.
- Injected at the top of every director-agent request as `[LONG-TERM USER MEMORY]`.
- Capped (~2 KB) so it never bloats the prompt.

### 3. Goodbye to the hard 30-message limit

- Replace `messages.slice(-30)` with: keep the last ~20 raw, fold the rest into the session summary. No 400, no silent loss.
- If summary + recent still risk exceeding model context, trim oldest *raw* messages first (their content is already in the summary).

### 4. Image / attachment memory

- The session summary explicitly tracks attachment URLs + what they are ("character sheet of Sara", "product hero shot"), so the Director can reference uploads from turn 1 even after 100 turns.
- Long-term memory keeps the most-recently-pinned subject sheets so cross-session references like "use Sara again" work.

## Technical details

**Files / edge functions**
- `supabase/functions/director-agent/index.ts` — remove the 30-cap slice; build prompt from `[long-term memory] + [session summary] + last N raw + recap`; trigger background summarization when history > threshold.
- New edge function `supabase/functions/director-summarize/index.ts` — gemini-3-flash, takes old messages + previous summary → returns updated structured summary JSON. Called fire-and-forget from director-agent after responding to the user (so latency is unaffected).
- New edge function `supabase/functions/director-user-memory/index.ts` — folds a finished session's summary into the user's long-term memory row.

**Database (one migration)**
- New table `public.director_user_memory` (user_id PK, memory jsonb, updated_at). RLS: user reads/writes own row. GRANTs for `authenticated` + `service_role`.
- No schema change needed on `director_sessions` — we reuse `brief_context.summary`.

**Client (`src/components/director/DirectorChat.tsx`)**
- No structural change to the UI. We stop sending the entire message array unbounded; the server now owns context assembly. Client still posts the recent messages (it already does).
- Add a small "Memory" section in Account → Preferences to view/clear long-term memory.

**Costs / limits**
- Summaries use gemini-3-flash (cheap), run only when history grows, and only over the newly-evicted slice.
- Hard caps: session summary ≤ 4 KB, long-term memory ≤ 2 KB, recent raw window = 20 messages.

## Out of scope

- No change to the storyboard/multi-angle renderers.
- No change to how attachments are uploaded or stored.
- No new UI in the chat itself — memory works invisibly.