# Make the AI Director Interactive

Three additions to the `/director` chat: smart quick-reply chips, mic-to-text in the composer, and a typing indicator that reacts to what the Director is actually doing — all in a concise, on-set cinematographer voice.

## 1. Quick-reply chips & suggested answers

Today `QuestionCard` already shows heuristic chips via `detectSuggestion()` (client-side regex). We'll upgrade this so chips are context-aware and also available in the main composer.

**Agent-side (`supabase/functions/director-agent/index.ts`)**
- Extend the `ask_clarification` tool schema with an optional `suggestions: { question_index: number; chips: string[]; allow_other?: boolean }[]` field.
- Update the system prompt (cinematographer voice — "lens choice", "shot size", "movement", "lighting key") to always return 3–5 short chips per question when the answer space is enumerable (lens, time-of-day, mood, aspect, movement, palette).
- After a `generate_prompt` turn, also emit `next_suggestions: string[]` (e.g. "Tighter on the eyes", "Push in slower", "Swap to anamorphic 2.39", "Render this") that the UI can show as one-tap follow-ups under the composer.

**Client-side**
- `QuestionCard.tsx`: prefer agent-supplied `suggestions[i].chips` over the heuristic `detectSuggestion()`; fall back to the heuristic when missing. Keep multi-select + "Other" behavior.
- New `src/components/director/QuickReplies.tsx`: pill row rendered below the composer when `lastBubble.role === "prompt" | "model_choice" | "assistant"` and chips exist. Tapping fills the textarea and auto-focuses (does not auto-send).
- Wire `next_suggestions` through the stream handler in `DirectorChat.tsx` into local state `quickReplies: string[]`, cleared on send.

## 2. Voice input in the composer

Add a hold-to-talk mic button to `Composer.tsx` using the existing `transcribe-audio` edge function.

- New hook `src/lib/director/useVoiceCapture.ts`: wraps `navigator.mediaDevices.getUserMedia` + `MediaRecorder` (audio/webm), records while button held (or toggled on mobile), returns a `Blob`.
- On stop: upload blob to the `director-uploads` storage bucket under `${uid}/voice/${uuid}.webm`, then `supabase.functions.invoke("transcribe-audio", { body: { storage_path } })`, append the returned text to the composer value, focus the textarea (do not auto-send — user reviews first).
- Mic button states: idle (mic icon), recording (pulsing red dot + waveform meter), transcribing (spinner), error (toast). Respect `prefers-reduced-motion`.
- Permission denial: show inline hint + link to browser settings. Hide button entirely if `MediaRecorder` is unavailable.
- The `transcribe-audio` function already enforces path-prefix auth — no backend change needed beyond confirming Whisper model & language passthrough.

## 3. Live streaming reactions (reactive typing indicator)

`TypingIndicator` already rotates static captions. Make captions reflect the Director's actual phase as the stream arrives.

- In `streamDirectorAgent` (api.ts) expose a new `onPhase(phase: "analyzing_image" | "decomposing_scene" | "choosing_model" | "writing_prompt" | "thinking")` callback. Derive the phase from:
  - presence of image attachments at request start → `analyzing_image`
  - first tool-call name on the partial stream (`ask_clarification` → `thinking`, `ask_model_choice` → `choosing_model`, `generate_prompt` → `writing_prompt`)
  - scene-decomposition keywords inside streamed text (`foreground`, `midground`, `lighting key`) → `decomposing_scene`
- `DirectorChat.tsx` keeps the current `phase` in state and feeds phase-specific captions to `TypingIndicator`:
  - analyzing_image: "Reading the frame…", "Catching the light…", "Logging the mise-en-scène…"
  - decomposing_scene: "Blocking foreground…", "Placing midground…", "Setting the key…"
  - choosing_model: "Matching the right engine…"
  - writing_prompt: "Calling the shot…", "Locking the lens…", "Final polish…"
- `AssistantAvatar` already accepts `state="scanning" | "thinking"`; add a third `state="writing"` (subtle aperture-spin variant) and pass it through.

## Tone pass

Sweep `director-agent` system prompt + all new captions/chips to a concise on-set voice: "Call the shot.", "Pick your lens.", "Hold for the move.". Replace warmer phrasings (e.g. "Almost there…") with cinematographer equivalents ("Final polish…"). No emoji.

## Files touched

- `supabase/functions/director-agent/index.ts` — schema + system prompt
- `src/lib/director/api.ts` — `onPhase` callback, parse `suggestions` / `next_suggestions`
- `src/components/director/QuestionCard.tsx` — prefer agent chips
- `src/components/director/QuickReplies.tsx` (new)
- `src/components/director/Composer.tsx` — mic button + quick replies slot
- `src/lib/director/useVoiceCapture.ts` (new)
- `src/components/director/TypingIndicator.tsx` — phase-driven captions
- `src/components/director/AssistantAvatar.tsx` — `writing` state
- `src/components/director/DirectorChat.tsx` — phase state, quick replies state, voice integration

## Out of scope

- No realtime WebSocket STT (uses existing batch `transcribe-audio` for cost/simplicity)
- No image annotation (deferred — separate task if you want it later)
- No backend schema/db changes

