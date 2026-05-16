# Make the Director ask which model to target

## Problem
Right now the AI Director silently picks the model for you (via its internal `recommended_model_id` algorithm) and writes the prompt around that pick. Because the user never gets to choose, the final prompt is often tuned for the wrong model.

## Goal
Before the Director writes the final cinematic prompt, it should ask the user **which video model** they want to target (with a sensible recommendation pre-selected), and then tailor the prompt specifically for that model.

## UX

1. When the Director has gathered enough brief info to be ready to generate, instead of jumping straight to the prompt, it sends one extra turn:
   - Short message: "Which model should I write this for?"
   - A model picker chip group rendered inline in the chat (reusing the existing model groups already shown in `PromptResultCard`).
   - The Director's algorithmic pick is highlighted as **Recommended** and pre-selected, with its one-line reason underneath.
   - A "Use recommended" primary button + the ability to click any other model chip to override.
2. Once the user picks (or accepts the recommendation), the Director proceeds to generate the final prompt locked to that `target_model`.
3. The chosen model is persisted on the session so reloads keep the same target, and the existing "Render with X" flow on the result card defaults to that same model.

## Technical changes

- **`supabase/functions/director-agent/index.ts`**
  - Add a new pre-generation step: when the agent decides it's ready, return a structured `awaiting_model_choice` payload (recommended id + alternatives + reason) instead of the final `prompt`/`breakdown`.
  - Add a second entry path that accepts a `chosen_model_id` from the client and then runs the existing prompt-writing step with that id pinned (skip the auto-pick, force breakdown.`recommended_model_id` = chosen).
- **`src/lib/director/api.ts`**
  - New `submitModelChoice(sessionId, modelId)` that calls the agent with the locked model and returns the final prompt result.
  - Extend the response type with the `awaiting_model_choice` variant.
- **`src/components/director/DirectorChat.tsx`**
  - Render a new assistant message type "model choice" that shows the chip picker (reuse the grouping logic already in `PromptResultCard`).
  - On select, call `submitModelChoice` and append the resulting prompt card as today.
- **`src/components/director/PromptResultCard.tsx`**
  - Default the render dialog's selected model to the user-chosen one (already in `recommendedModel`, just make sure the upstream value is the user's pick, not the agent's auto-pick).
- **DB (small migration)**
  - Add `chosen_model_id text` to `director_sessions` so the choice is persisted alongside the brief.

## Out of scope
- No changes to the model catalog itself.
- No changes to the render/queue pipeline.
- Marketing Studio flow is untouched.

Approve this and I'll implement it.
