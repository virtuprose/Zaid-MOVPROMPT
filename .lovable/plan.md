## Make the AI Director chat feel like a real person

Right now the Director responds with a single static shimmer ("Director is reading the brief…") and bubbles just appear. We'll add presence cues, identity, and human cadence — without touching backend or prompt logic.

### 1. Give the Director a face and identity
- Add an animated **assistant avatar** next to every assistant bubble: a soft glowing circle with the logo mark, with a subtle breathing/pulse halo when idle and a faster pulse when "thinking".
- Add a small persistent header strip inside the chat with: avatar · name ("Director") · live status dot (green = ready, amber = thinking, cyan pulsing = typing) · short status text ("online", "thinking…", "typing…", "looking at your references…").
- First-time greeting: replace the static welcome with a short staged sequence — avatar fades in, status flips to "typing…", then the welcome text streams in character-by-character.

### 2. Replace the single shimmer with staged "presence" states
While `busy`, cycle through realistic, context-aware micro-statuses instead of one line:
  - "Looking at your references…" (only when attachments were sent)
  - "Thinking about the shot…"
  - "Sketching the prompt…"
  - "Almost there…"
- Render as a **typing indicator bubble** (three bouncing dots in an assistant bubble) with the current status as a tiny caption under it.
- When the stream starts producing tokens, switch from dots → live cursor caret blinking at the end of the streaming text.

### 3. Human-cadence text reveal
- For non-streamed assistant lines (welcome, error recoveries, transitional messages like "Sending this to the renderer…"), reveal text with a typewriter effect (~25–40ms/char, faster for long messages, respects `prefers-reduced-motion`).
- For streamed responses, keep server tokens but append a blinking caret span until the stream ends.

### 4. Micro-interactions that signal "someone is there"
- New bubbles animate in with `fade-in + slide-up` (use existing `animate-fade-in` keyframes, add a slight Y translate).
- Avatar **reacts** to events:
  - User hits send → avatar nods (quick scale 1 → 0.95 → 1).
  - Attachments added → avatar briefly shows a small eye/scan ring sweep ("I see them").
  - Prompt result arrives → avatar flashes a soft cyan glow + tiny check pulse.
- When the user is typing in the composer, the assistant status flips to "listening…" with a subtle waveform/ear glyph (debounced, hides after 800ms of inactivity).
- Idle nudge: if the chat sits idle for ~45s after the first welcome with no input, the Director sends a short prompt-style nudge ("Still there? Tell me the vibe and I'll take it from there.") with the typing indicator first.

### 5. Conversational warmth (copy-only, frontend)
- Vary the "thinking" captions and starter chips so it doesn't feel scripted.
- Add a tiny **mood line** under the status dot that rotates between idle phrases: "Ready when you are.", "Pitch me the scene.", "I'm all eyes."
- Soften error fallback copy ("Hit a snag reaching the model…" → "Lost you for a sec — mind sending that again?").

### 6. Sound (optional, off by default)
- Add a muted speaker toggle in the chat header. When enabled:
  - Soft "tick" on each user send.
  - Subtle "chime" when a prompt result lands.
- Persist preference in `localStorage`. Default OFF so we don't surprise anyone.

### Scope / files touched
Frontend only, no backend, no prompt changes:
- `src/components/director/DirectorChat.tsx` — avatar, header strip, status state machine, idle nudge, animated bubble mount, typing indicator, mood line.
- `src/components/director/Composer.tsx` — emit "user is typing" signal up via a new prop.
- New `src/components/director/AssistantAvatar.tsx` — animated avatar with reaction states (`idle | thinking | listening | success | scanning`).
- New `src/components/director/TypingIndicator.tsx` — 3-dot bubble + rotating caption.
- New `src/components/director/TypewriterText.tsx` — character reveal with reduced-motion fallback.
- New `src/hooks/useDirectorPresence.ts` — small state machine for status + rotating captions.
- `tailwind.config.ts` — add a couple of keyframes (`breath`, `dot-bounce`, `caret-blink`, `nod`).
- Optional sound assets in `src/assets/sfx/` only if you want the audio toggle.

### Out of scope
- No changes to `director-agent` edge function, prompt templates, streaming protocol, or persistence.
- No real voice/TTS — strictly visual/textual presence cues (audio toggle is optional UI chrome only).
- No changes to the prompt result card, approval flow, or attachment moderation.

### Accessibility
- All animations honor `prefers-reduced-motion`: typewriter falls back to instant text, avatar breath/nod disabled, dots replaced with a static "Director is typing" caption.
- Status changes are announced via `aria-live="polite"` on the header status line.
