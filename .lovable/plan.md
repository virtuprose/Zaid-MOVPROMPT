## Goal

Make the AI Director "learn" from each user globally. Two signals feed one taste profile that the `director-agent` reads on every turn.

## Signals captured

1. **Per-message thumbs (new)** — 👍 / 👎 on every Director reply: clarification questions, prompt drafts, suggestion chips, recommendations.
2. **Video likes (existing)** — the heart on rendered `video_jobs` already present in `DirectorChat`, `PromptResultCard`, `VideoBubble`.

Both feed one global "taste profile" per user (no per-session memory).

## What the Director does with it

- **Inject liked prompts as style few-shots** — top 2–3 highest-signal prompts (liked video OR 👍'd prompt draft) passed into `director-agent` system context as "USER-APPROVED STYLE REFERENCES".
- **Avoid disliked patterns** — top 2–3 most-disliked prompt drafts injected as "USER-REJECTED PATTERNS — do not mimic tone, structure, or vocabulary".
- **Rank suggestion chips by past likes** — chip text appearing in liked prompts/replies gets boosted; chips appearing in disliked ones get suppressed or dropped. Sorting happens in the agent's `suggestions` post-processing.
- **Bias question style / pacing** — derive two scalars from feedback history: `verbosity` (terse ↔ detailed) and `chip_reliance` (mostly chips ↔ mostly free-text). Append a short "USER COMMUNICATION PREFERENCE" line to the system prompt so the agent picks shorter questions / more chips when that's what gets thumbs-up.

## Data model

New table `director_message_feedback` (migration):

```text
id uuid pk
user_id uuid          -- auth.uid()
session_id uuid       -- FK director_sessions.id (nullable)
message_index int     -- position in session.messages
content_kind text     -- 'question' | 'prompt' | 'recommendation' | 'chip'
content text          -- the assistant text (or chip label) being rated
rating smallint       -- +1 or -1
chip_label text       -- optional, when content_kind = 'chip'
question_text text    -- optional, the parent question for chip ratings
created_at timestamptz
```

RLS: owner-only CRUD (`auth.uid() = user_id`). Filtered index on `(user_id, created_at desc)`.

No schema change to `video_jobs` — `liked` + `metadata` from the previous loop are reused.

## Taste profile builder

`src/lib/director/tasteProfile.ts` (new) exports `loadTasteProfile(userId)` returning:

```ts
{
  likedPrompts: string[];        // ≤3, most recent thumbs-up prompts + liked-video prompts
  dislikedPrompts: string[];     // ≤3, most recent thumbs-down prompts
  chipBoosts: Record<string,number>;   // chip text → score
  verbosity: 'terse' | 'balanced' | 'detailed';
  chipReliance: 'chips_first' | 'mixed' | 'freeform_friendly';
}
```

Logic: pull last ~50 feedback rows + last ~20 liked `video_jobs`. Bucket by `content_kind`. Verbosity = inverse mean of liked-question length. Chip reliance = ratio of 👍'd chip taps vs 👍'd freeform answers.

## Wiring

- **`supabase/functions/director-agent/index.ts`**
  - Accept `tasteProfile` in request body (validated with zod).
  - Inject into system prompt: a `USER-APPROVED STYLE REFERENCES` block (likedPrompts), a `USER-REJECTED PATTERNS` block (dislikedPrompts), and a one-line `USER COMMUNICATION PREFERENCE` (verbosity + chipReliance).
  - After the LLM returns `suggestions`, re-sort each `chips` array by `chipBoosts` (boosts up, suppressed down, hard-drop if score ≤ −2).
- **`src/lib/director/api.ts`** — `runDirectorAgent` forwards `tasteProfile`.
- **`src/components/director/DirectorChat.tsx`**
  - Load taste profile once per session mount, pass to every `runDirectorAgent` call.
  - Render small 👍/👎 buttons under each assistant message (questions, prompt drafts, recommendations). On click → insert into `director_message_feedback` and optimistically update local state. Show subtle "Saved — Director will adapt" toast on first thumb of a session.
  - Chip tap already implies positive signal; record it as `rating=+1, content_kind='chip'` automatically.
- **`src/components/director/PromptResultCard.tsx`, `VideoBubble.tsx`** — no UI change; the heart already sets `video_jobs.liked` which the taste profile reads.

## Files touched

```text
NEW  supabase/migrations/<ts>_director_feedback.sql
EDIT supabase/functions/director-agent/index.ts
EDIT src/lib/director/api.ts
NEW  src/lib/director/tasteProfile.ts
EDIT src/components/director/DirectorChat.tsx
NEW  src/components/director/MessageFeedback.tsx   // small 👍/👎 row
EDIT src/integrations/supabase/types.ts            // auto, after migration
```

## Out of scope (intentionally)

- No model fine-tuning or vector store.
- No cross-user "popular chips" — taste profile is strictly per user.
- No retroactive backfill — existing chats start with empty profile and learn from the next thumb.
