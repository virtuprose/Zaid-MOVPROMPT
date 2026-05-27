## Problem

When you cross over from MovPrompt to the AI Director, you've already picked aspect ratio, duration, and model in MovPrompt. Today those choices are stored client-side as a visual "handoff chip" but **never reach the Director agent**. The agent then walks its normal routing questions (duration → audio → aspect → model) from scratch, so you answer the same things twice.

Root cause, in code:
- `src/components/director/DirectorChat.tsx` (line ~263) reads `handoff.settings` and only puts them into a UI chip (`setHandoffChip`).
- `src/lib/director/api.ts` `streamDirectorAgent` (line ~404) sends `{ messages, attachments, stream, tasteProfile, mode }` to `director-agent` — no settings.
- `supabase/functions/director-agent/index.ts` already has the rule "Do NOT ask a routing question whose answer is already implied by the brief" — it just never sees these answers.

## Fix

Make the locked MovPrompt spec visible to the agent as ground truth, in three coordinated places.

### 1. Carry the handoff on the client past the first message
- Store the full `handoff.settings` (plus `source`) in a ref alongside `handoffChip`, so it survives the first send and any re-render.
- Clear it once the user has actually confirmed / changed the spec (e.g. after `ask_model_choice` resolves, or after the first `generate_prompt`).

### 2. Send the locked spec to the edge function
- Extend `streamDirectorAgent` / `callDirectorAgent` signature with an optional `lockedSpec?: { source, model?, aspect?, duration? }`.
- Include it in the POST body: `{ messages, attachments, lockedSpec, ... }`.

### 3. Teach `director-agent` to honor it
- In `supabase/functions/director-agent/index.ts`, read `lockedSpec` from the request and, when present, prepend a short system note before the existing system prompt, e.g.:
  ```
  LOCKED HANDOFF SPEC (from MovPrompt — treat as already answered):
  - model: <id>            → skip ask_model_choice; use this model
  - aspect_ratio: <value>  → do NOT ask aspect
  - duration: <value>s     → do NOT ask duration
  Only ask routing axes that are still missing (audio, resolution, style, input_mode). If all six axes are covered, go straight to generate_prompt.
  ```
- Also mirror these into the existing "Locked spec: …" recap line the agent already understands, so downstream `ask_model_choice` / `generate_prompt` calls inherit them.

### 4. UX polish
- Keep the existing chip, but add a small "Change" affordance so users can override a locked field if they want — overriding clears that one field from `lockedSpec` for subsequent turns.
- If the handoff carries a `model`, render the chip as "Locked from MovPrompt" rather than just a label, so the user understands why the Director isn't asking.

## Out of scope
- Marketing Studio → Director handoff already passes similar settings; same mechanism will benefit it, but no behavior change is requested there beyond what falls out naturally.
- No changes to the MovPrompt side — it already writes the right payload via `writeHandoff`.

## Files touched
- `src/components/director/DirectorChat.tsx` — keep settings in a ref, pass to `streamDirectorAgent`, clear after first prompt is generated.
- `src/lib/director/api.ts` — add `lockedSpec` to request body and types.
- `supabase/functions/director-agent/index.ts` — read `lockedSpec`, inject into system prompt, suppress redundant routing questions.

## Verification
- Start in MovPrompt, set aspect 9:16 + duration 8s + a model, click "Open in AI Director".
- Type a one-line brief ("a neon street chase at night").
- Expect: Director skips aspect/duration/model questions, only asks the remaining axes (e.g. audio) and then generates the prompt directly.
- Manually overriding the chip should re-enable that one question on the next turn.
