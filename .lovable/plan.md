# Director ↔ Free chat — Bridged Mode

Based on your answers:
- **Shared scroll stays.** One timeline = one creative session.
- **Pro user.** Keep the mode toggle visible; make hopping between modes effortless.
- **Free chat becomes session-aware** — can reference panels, locked style, attachments.

## What changes (UX)

### 1. Free chat learns the session
When in **Free chat** inside a Director session, every send silently prepends a compact "session context" block to the model:
- Session title + phase
- Locked `style_spec` (if any)
- Latest `result` bubble summary (mode, panel count, model)
- Per-panel index → caption + prompt excerpt (so "panel 3" resolves)
- Last 2 user attachments (filename + signed url)

User types naturally ("explain the prompt for panel 3", "why Veo for shot 2?") and it just works. No UI noise.

### 2. Quick-reference chips above the composer (Free chat only)
A thin row appears above the input when there's session context:
`@panel 1 · @panel 2 · @panel 3 · @style · @final-prompt`
Click → insert the token. The agent resolves it from the context block.

### 3. Two handoff buttons (the "bridge")
- **In Free chat assistant bubbles** → small "→ Send to Director" pill at the bottom-right. Click: switches mode to Director, pre-fills the composer with the suggested instruction (e.g. "rework panel 3 with a wider lens"). User just hits Send.
- **In Director result bubbles / PromptInspector** → "Ask DP about this" pill next to existing actions. Click: switches mode to Free chat with composer pre-loaded (`"Explain the prompt for panel N: …"`).

### 4. One-line affordance on the mode toggle
First time a user enters Free chat in an active session, a tiny dismissible hint:
> "Free chat can see your panels, style, and attachments. Try: 'why panel 3?'"
Stored in `localStorage`.

## What we are NOT doing
- No split canvas (shared timeline is a feature).
- No auto-routing — pros want explicit mode control.
- No sidebar/drawer.
- No DB schema changes. No new edge function.

## Technical notes

**Files touched (frontend only):**
- `src/components/director/DirectorChat.tsx`
  - New helper `buildSessionContextBlock(bubbles, lockedSpec, sessionTitle)` returning compact markdown with stable panel indices.
  - When `chatMode === "free_chat"`, prepend that block as a leading system/user context message in the history sent to `streamDirectorAgent`. Gate on "has any bubbles".
  - Render chip row above Composer when in free chat **and** context block non-empty. Chip click → insert `@panel-3` token.
  - Render "→ Send to Director" pill on free-chat assistant bubbles. Handler: `handleModeChange("director")` + `setInput(prefill)` + focus composer.
  - Add dismissible hint banner above composer (first free-chat entry, localStorage flag).
- `src/components/director/PromptResultCard.tsx` and/or `PromptInspector.tsx`
  - Add "Ask DP about this" button. Per-panel variant in storyboard mode. Handler: switch to free chat + prefill.
- `src/components/director/Composer.tsx`
  - Accept optional `prefillNonce` prop to retrigger focus/caret-end when handoff fires.
- `src/lib/director/api.ts` — no signature change; only enrich history we send.

**Context block budget:** cap ~1.5k chars. Keep locked spec + last result + first N panel excerpts (truncate each prompt to ~180 chars).

**Stable panel ids:** use order from the latest `result` bubble's `per_shot_prompts`. Surfaces as `panel 1…N` everywhere.

**No Director-mode regression:** behavior unchanged when `chatMode === "director"`. Context block injected only on free-chat sends.

## Out of scope (future)
- Mention-autocomplete for `@panel-N` inside Director composer.
- Persisting "asked the DP about panel 3" as a thread anchor.
- Piping a DP answer back into Director as guidance for the next generation.
