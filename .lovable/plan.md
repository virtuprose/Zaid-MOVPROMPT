# Add voice input to "Describe Your Vision"

Let users either type or record their scene description in `ConfigPanel`. Recorded audio is transcribed and appended into the same textarea, so the rest of the flow is unchanged.

## UX

- Add a small mic button inside the textarea (bottom-left, opposite the char counter).
- States:
  - Idle: mic icon, tooltip "Record description".
  - Recording: red pulsing mic + a tiny live level bar + a "Stop" affordance and elapsed timer (e.g. `0:08`). Click again to stop.
  - Transcribing: spinner + "Transcribing…" inline.
  - Error: toast with the message from the hook.
- On successful transcription, append the text to the current description (with a space if there's existing text) and focus the textarea. Do not overwrite what the user already typed.
- If the user isn't signed in or the browser doesn't support `MediaRecorder`, hide the mic button (the hook already reports `supported` and requires a `userId`).

## Implementation

Reuse the existing infrastructure — no new backend work:
- `src/lib/director/useVoiceCapture.ts` (mic capture + upload + invoke `transcribe-audio`)
- `supabase/functions/transcribe-audio` edge function
- `director-uploads` storage bucket

Changes:
1. `src/components/ConfigPanel.tsx`
   - Accept current user via `useAuth()` to get `userId`.
   - Wire `useVoiceCapture({ userId, onTranscript, onError })`:
     - `onTranscript(text)` → `onDescriptionChange(description ? description + " " + text : text)`.
     - `onError(msg)` → `toast({ variant: "destructive", description: msg })`.
   - Add a mic IconButton inside the textarea wrapper (absolute bottom-left, `start-3`), mirroring the existing char-counter positioning. Add small bottom-left padding to the textarea (`ps-9` in LTR / RTL-safe) so text doesn't collide with the button.
   - Render state-driven icon: `Mic` (idle), `Square` + pulse ring (recording, with timer), `Loader2` spinning (transcribing). Disable while transcribing.
   - Add new i18n keys: `config.record`, `config.stopRecording`, `config.transcribing`, `config.recordError`, `config.notSupported` in `src/i18n/translations/en.ts` and `ar.ts`.

2. No schema, no new edge function, no new dependency.

## Acceptance

- Mic button visible to signed-in users on supported browsers; hidden otherwise.
- Clicking mic → permission prompt → recording indicator + timer.
- Clicking stop → "Transcribing…" → text appended to the description field.
- Errors surface as a toast; textarea remains usable for typing throughout.
- Light and dark themes both render correctly (uses semantic tokens only).
