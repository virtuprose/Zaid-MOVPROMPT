## Add voice-to-text to "Describe your ad"

Add a mic button inside the existing 280-char "Describe your ad" input on Marketing Studio, reusing the same `useVoiceCapture` hook already powering Director's ConfigPanel.

### Behavior
- Mic button sits inside the input row (left of the clear `×`), only shown when signed in and the browser supports MediaRecorder.
- Click mic → starts recording, shows pulsing red square + elapsed timer.
- Click again (or auto-stop) → uploads audio to `director-uploads` bucket and calls existing `transcribe-audio` edge function.
- Returned transcript is appended to `userNote` (space-joined), trimmed to the 280-char cap.
- During transcription: spinner + disabled state. Errors surface via `toast.error`.
- Anonymous users / unsupported browsers: mic hidden (same rule as ConfigPanel).

### Implementation
- **File:** `src/pages/MarketingStudio.tsx` only.
  - Import `useVoiceCapture`, `useAuth`, `Mic`, `Square`, `Loader2`, `toast`.
  - Add `descRef` to mirror `userNote` and `onTranscript` handler that appends within the 280 limit.
  - Render mic button inside the existing input container (line ~835), before the clear button.
- No backend changes — `transcribe-audio` function and `director-uploads` bucket already exist and are used by `ConfigPanel`.
- No new strings/i18n keys needed (Marketing Studio uses plain English labels here).

### Out of scope
- No changes to generation flow, prompt composer, or the AccuracyBoost dialog.
- No changes to Director chat or ConfigPanel.