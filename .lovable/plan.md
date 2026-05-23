# Director Feedback Loop

Make the AI Director adapt to each user's taste using two signals:
1. **Per-message 👍/👎** on assistant replies in the Director chat (new)
2. **Heart likes** on rendered videos (already exists on `video_jobs.liked`)

Both feed a **global, per-user taste profile** injected into every new Director session.

## What gets built

### 1. Taste profile builder — `src/lib/director/tasteProfile.ts` (new)
Pure client helper. Queries Supabase for the current user and returns:
- `likedPrompts: string[]` — up to 3 most recent `video_jobs.prompt` where `liked = true`
- `dislikedPrompts: string[]` — up to 3 recent `director_message_feedback` rows where `rating = -1` and `content_kind = 'prompt'`
- `chipBoosts: Record<string, number>` — sum of ratings per `chip_label` from feedback (e.g. `{ "Golden hour": +2, "Neon": -1 }`)
- `verbosity: 'terse' | 'balanced' | 'detailed'` — inferred from thumb ratios on `content_kind='question'` (long questions disliked → terse; short questions disliked → detailed)
- `chipReliance: 'chips_first' | 'mixed' | 'freeform_friendly'` — inferred from chip rating volume vs question ratings

Cached in-memory per session mount.

### 2. Director agent — `supabase/functions/director-agent/index.ts`
- Accept optional `tasteProfile` in request body (zod-validated)
- Inject into system prompt:
  - `USER-APPROVED STYLE REFERENCES` block listing `likedPrompts` ("Match this aesthetic when relevant")
  - `USER-REJECTED PATTERNS` block listing `dislikedPrompts` ("Avoid this style/approach")
  - Verbosity directive ("Keep questions terse" / "Offer richer detail")
  - Chip reliance directive ("Lead with chips" / "Prefer free-text prompting")
- After model response, re-sort returned `chips` array by `chipBoosts`:
  - Boost score ≥ +1 → move to front
  - Score ≤ −2 → drop entirely
  - Otherwise preserve model order

### 3. API client — `src/lib/director/api.ts`
`runDirectorAgent` accepts and forwards `tasteProfile` to the edge function.

### 4. Feedback UI — `src/components/director/MessageFeedback.tsx` (new)
Small inline row under each assistant message:
- 👍 / 👎 ghost icon buttons (cyan glow on active state, matches design tokens)
- On click: insert into `director_message_feedback` with `user_id`, `session_id`, `message_index`, `content_kind` (derived from message: 'question' | 'prompt' | 'recommendation'), `content` (the message text), `rating` (+1/-1), `question_text` (if it was a question)
- Optimistic state — click toggles visually immediately
- First-ever thumb in a session triggers toast: "Saved — the Director will adapt to your taste"

### 5. Chat wiring — `src/components/director/DirectorChat.tsx`
- On mount: load taste profile once, hold in component state
- Pass `tasteProfile` to every `runDirectorAgent` call
- Render `<MessageFeedback />` under each assistant message (skip user messages and pure system status)
- Derive `content_kind` per message: presence of `chips` or `?` → 'question'; presence of finalized prompt → 'prompt'; else 'recommendation'

## Out of scope
- No retroactive backfill of prior sessions
- No cross-user "popular chips"
- No model fine-tuning — purely prompt-engineering + chip re-ranking
- No thumbs on user's own messages or chip taps (chips get implicit signal via the resulting prompt being liked/disliked)

## Files touched
- new: `src/lib/director/tasteProfile.ts`
- new: `src/components/director/MessageFeedback.tsx`
- edit: `supabase/functions/director-agent/index.ts`
- edit: `src/lib/director/api.ts`
- edit: `src/components/director/DirectorChat.tsx`

Migration + table already exist (`director_message_feedback` with RLS).
