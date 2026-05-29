# Fix Free-Chat ↔ Director handoff + missing-info guard

Two related problems from the reported flow:

1. **Free Chat felt transactional** — it replied with a structured 15-shot "Seedance card", then the user moved to Director and the video rendered as 5s with no questions asked.
2. **Director skipped routing axes** (duration, aspect ratio, audio) and went straight to `request_video_generation` because it treated the prior Free-Chat markdown as already-locked spec.

## What to change

### 1. Free Chat persona (warm collaborator, not order-taker)

File: `supabase/functions/director-agent/index.ts` — rewrite `FREE_CHAT_SYSTEM`.

New behavior:
- Warm, conversational tone ("Love this idea — let's shape it together…"), acknowledge any attached refs by name and what's visible.
- Brainstorm freely: discuss concepts, beats, references, model trade-offs.
- **Never** fabricate structured "video generation cards", shot tables, or claim a render is queued. Markdown only, no fake JSON / card UI.
- When the user asks to actually generate ("make the video", "render it", "use Seedance"), do NOT pretend to generate. Instead, summarize what's locked so far and say: *"Switch to **Director** (toggle in the composer) and I'll wire it up — you'll get to confirm the model, aspect, duration, and audio before it renders."*
- Echo back any uploaded reference names so the user knows they carry over.

### 2. Director: hard guard on missing routing axes

Same file, `SYSTEM_PROMPT` section that owns video generation.

Add a **PRE-GENERATION CHECKLIST (HARD RULE)** before any `request_video_generation` / `request_story_render` call:
- Required locked axes: `duration_seconds`, `aspect_ratio`, `audio`, plus `recommended_model_id`.
- Source of truth: user's explicit answers in the **Director** turns, the handoff `lockedSpec`, or unambiguous brief signals ("vertical TikTok" → 9:16, "8-second clip" → 8s). 
- **Prior Free-Chat assistant markdown is NOT authoritative.** Add an instruction that any assistant turn coming from Free Chat (marked, see #3) must be treated as brainstorming context only — never as a locked spec.
- If any required axis is still missing, call `ask_clarification` with EXACTLY ONE question following the existing priority order (input mode → duration → audio → aspect → resolution → style). Loop one-per-turn until all are locked.
- Only then call `ask_model_choice` (or skip if model is named) and finally `request_video_generation`.

### 3. Tag Free-Chat turns in the serialized history

File: `src/components/director/DirectorChat.tsx` (where assistant bubbles are pushed into `history` for `streamDirectorAgent`).

When a bubble was produced in `free_chat` mode (we already store `markdown: true` on those), prefix its serialized content with `[Free-chat brainstorm — NOT a locked spec]\n` before sending. This lets the Director system rule above (#2) reliably distinguish it.

Add a small `freeChat?: boolean` flag on assistant bubbles created in `free_chat` mode and use it in the history serializer; this is cleaner than sniffing `markdown`.

### 4. Composer nudge when switching modes

File: `src/components/director/Composer.tsx`.

When the user toggles from Free chat → Director and the session has any prior turns/attachments, show a one-line subtle hint above the composer: *"Director will confirm model, aspect, duration, and audio before rendering."* Auto-dismisses on first send. Pure presentation, no logic changes.

## Out of scope

- No changes to credits, video providers, or the actual `generate-video` edge function.
- No changes to story-mode flow beyond the same pre-generation checklist applying.

## Technical details

- `FREE_CHAT_SYSTEM` constant rewrite in `supabase/functions/director-agent/index.ts` (~line 1019).
- New `PRE-GENERATION CHECKLIST` block inserted into `SYSTEM_PROMPT` near the existing "ONE QUESTION PER TURN" rules (~line 131).
- `DirectorChat.tsx`: extend bubble type with `freeChat?: boolean`; set it when `chatMode === "free_chat"` at bubble-creation sites; in the history-serialization loop (~line 1320), prepend the tag when `b.freeChat`.
- `Composer.tsx`: small `useState` for the hint, shown when `mode === "director"` and `prevMode === "free_chat"`, cleared on submit.
