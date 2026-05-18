## Problem

In your session the Director asked only 3 things (subject, aspect ratio, audio), then jumped straight to "pick a model" and emitted the prompt. It never asked about **resolution**, never confirmed the **15s duration** out loud, and didn't recap the full spec before committing. That makes the recommendation feel guessed and leaves the render dialog as the first place the user sees options like 720p vs 1080p vs 4K.

The behavior is driven by `supabase/functions/director-agent/index.ts` — the SYSTEM_PROMPT only enumerates **4 routing axes** (input mode, duration, audio, aspect ratio). Resolution is not in the list, so the model never asks. It's also allowed to stop at 3 questions even when more are unknown.

## Goal

Before `ask_model_choice` / `generate_prompt`, the Director must know — and visibly echo back — every axis that materially changes the output, including resolution. No silent assumptions.

## Plan

### 1. Add resolution as a 5th routing axis
In `supabase/functions/director-agent/index.ts`, extend the `MODEL-ROUTING QUESTIONS` block:
- Add axis **5. Resolution / fidelity** — 720p, 1080p, native 4K (Kling v3 4K only), or "fastest/cheapest". Drives kling-v3-4k routing and 1080p-capable filters.
- Update the priority order to: input mode → duration → audio → aspect ratio → resolution.
- Raise the per-turn cap from 3 to 4 questions when needed (still capped, still one-tap chips). Media-drop coherence rule stays.
- Add the inferred-skip rule for resolution (e.g. "TikTok draft" → 720p known, "native 4K" → 4K known).

### 2. Require a spec recap before model choice
Add a HARD RULE: before calling `ask_model_choice`, the Director must have explicit or strongly-implied values for **all 5 axes**. If any is still unknown after the brief + answers, ask the remaining ones in the next `ask_clarification` turn instead of jumping to model choice.

When it does call `ask_model_choice`, the `reason` field must restate the locked spec in one line, e.g.:
> "Locked: 15s · 9:16 · native SFX · 1080p — Kling Omni fits best because…"

So the user sees what was assumed before tapping.

### 3. Surface resolution in the model-choice card
In `src/components/director/ModelChoiceCard.tsx`, render the spec line (duration / aspect / audio / resolution) as small chips above the recommendation, sourced from the new `reason` recap or from a new optional `locked_spec` object on the tool payload. Lets the user spot a wrong assumption before committing.

### 4. Pre-fill the render dialog from the locked spec
In `src/components/director/PromptResultCard.tsx` + `VideoOptionsDialog.tsx`, when opening the dialog, seed `options.resolution` / `aspect_ratio` / `duration` from the Director's locked spec (already partially done for aspect/duration). Add resolution so the dialog opens on the value the user already agreed to, not the model default.

### 5. Anti-hallucination guard on the recap
Add to the prompt: "Never claim a value the user did not state or that is not directly implied by an attached reference. If unsure, ASK — do not assume." Reinforces no silent defaults for resolution/audio/aspect.

## Technical details

Files touched:
- `supabase/functions/director-agent/index.ts` — SYSTEM_PROMPT routing axes + recap rule; optionally add a `locked_spec` object to `ask_model_choice` / `generate_prompt` tool schemas with `{ duration_seconds, aspect_ratio, audio, resolution, input_mode }`.
- `src/components/director/ModelChoiceCard.tsx` — render spec chips from `locked_spec` (fallback: parse `reason`).
- `src/components/director/PromptResultCard.tsx` — pass `locked_spec.resolution` into the options dialog seed.
- `src/components/director/VideoOptionsDialog.tsx` — accept an `initialOptions` prop override to seed resolution/aspect/duration from the Director instead of `controls.defaults`.

Not touched: the model catalog, the rendering pipeline, the kling-v3-4k routing in `generate-video` — those already work; this plan only changes what the Director asks and confirms.

## Out of scope

- Restructuring the chat flow (still tool-call driven, still streaming).
- Adding non-routing knobs (cfg_scale, prompt_optimizer) to the Director questionnaire — those stay in the render dialog as power-user controls. We only promote axes that genuinely change the recommended model or the prompt wording.
