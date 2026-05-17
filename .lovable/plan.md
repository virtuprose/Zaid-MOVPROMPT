## The two bugs you're seeing

Both come from the same place — `src/components/director/DirectorChat.tsx` `send()` and `src/lib/director/api.ts`:

1. **The Director forgets your uploads.** Every turn only sends the *current* composer attachments. After you upload an image and hit send, `setAttachments([])` clears them — so on your next message the agent literally receives zero images and has to ask you to drop it again.
2. **The Director forgets what it just said.** The history we send to the model filters down to only plain `user` / `assistant` text bubbles. The bubbles for *generated prompts*, *clarification questions*, and *model-choice cards* are dropped. So when you ask "give me 3 ideas for this image" after a result already exists, the model has no memory of having produced anything, no memory of the image, and just writes one new prompt.

And the model-selection question:

3. **How the model is chosen today.** The edge function (`supabase/functions/director-agent/index.ts`) runs a 4-step algorithm — input gating → capability gating → aesthetic ranking → output — and *should* call `ask_model_choice` before `generate_prompt`. In practice it often skips straight to generation because the system prompt lets it skip the question when the brief looks "complete enough." You want it to **always** confirm the target model up front, since the final wording is tuned per model.

## Fix

### 1. Carry every attachment from the whole chat into every turn

In `DirectorChat.tsx` `send()`, instead of just passing the current `attachments` state, collect attachments from every prior `user` bubble in `bubbles` + the ones being sent now, dedupe by `url`/`name`, and pass the combined list to `streamDirectorAgent`. Cap at ~12 (the edge function already slices to 12 / 8 images) so we don't blow the token budget; prefer the most recent.

### 2. Serialize non-text bubbles into the history so the agent remembers them

Still in `send()`, replace the current `history` filter. For each bubble produce a `DirectorMsg`:
- `user` → as today (text + a short "[Attached: image.png, brief.pdf]" suffix so the model knows what was attached on that turn).
- `assistant` text → as today.
- `result` → assistant message summarizing the generated prompt: title, the full prompt text, recommended model id, and the key breakdown fields. This is what makes "give me 3 variations" actually variations of *that* prompt.
- `questions` → assistant message: "I asked: 1) … 2) …".
- `model_choice` → assistant message: "I recommended model X (alts: Y, Z) because …" — and, if the user later picked one, also add a synthetic user line "Target model: X" so the agent treats it as locked.

This makes the conversation self-describing without changing the DB shape (bubbles are still persisted as today).

### 3. Make "which model?" the first real question

In `supabase/functions/director-agent/index.ts` `SYSTEM_PROMPT`:
- Tighten the "CONFIRM THE TARGET MODEL BEFORE GENERATING" block so `ask_model_choice` runs on the **first turn that has enough info to generate**, not only "when 2+ axes missing." The two existing exceptions stay: user already named a model, or user already picked one earlier in the thread.
- Add an explicit rule: when the user attaches a reference image / video, fire `ask_model_choice` first (so they can choose between e.g. seedance-v1-pro vs veo-3.1 vs kling-omni for that exact image) and **only after** the pick, generate the prompt.
- Add a rule: if the user's latest message contains "ideas", "variations", "options", "N versions", do NOT call `generate_prompt` once — call it once per idea (the frontend already shows a list of result bubbles) or, simpler, return `ask_clarification` asking which of N concepts to develop. I'll go with the simpler "produce a single best one + offer to expand" pattern and update the system prompt to acknowledge "N ideas" requests explicitly so it never silently collapses to one.

### 4. Small UX hint in the model-choice card

The card already exists (`ModelChoiceCard.tsx`). When the user clicks a model, the next `send()` already adds a synthetic message; we'll standardize it to `"Target model: <id>"` so the rule in step 3's exception is unambiguous.

## Technical scope

Files touched (frontend + one edge function — no DB migration):
- `src/components/director/DirectorChat.tsx` — rewrite the history + attachments construction inside `send()`.
- `src/lib/director/api.ts` — no signature change; just make sure `Attachment[]` accepts the merged list (it already does).
- `src/components/director/ModelChoiceCard.tsx` — confirm the click handler sends the `Target model: <id>` line (1-line tweak if needed).
- `supabase/functions/director-agent/index.ts` — update `SYSTEM_PROMPT` rules around `ask_model_choice` and "N ideas" requests. No tool-schema changes.

## Out of scope

- No change to the model selection *algorithm itself* (Steps 1–4 in the system prompt stay; they're already good — they just need to be invoked at the right time).
- No DB schema change. Bubbles are already persisted with their attachments.
- No change to video generation, Library, or Ads Studio.

Approve and I'll implement.