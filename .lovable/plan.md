# Seedance: shot-count question + mandatory Timeline Prompting

## What's broken today

The black-titanium watch brief picked **Seedance** at **15s**, but the Director:
1. Never asked **how many shots** to split those 15s into — it silently produced one shot.
2. Returned a flat single-paragraph `mainPrompt` instead of the clock-pinned **TIMELINE / EFFECTS INVENTORY / DENSITY MAP / ENERGY ARC** structure that Seedance reads best.

Root cause: the timeline structure exists in `supabase/functions/generate-prompt/experts/_base.ts` (`timelineAddendum`) but it is only wired to a legacy toggle in `src/components/WorkflowPanel.tsx`. The chat-based **Director agent** (`supabase/functions/director-agent/index.ts`) never sets `timelineEnabled` and has no rule to ask about shot count for Seedance.

## Goal

Whenever the resolved model family is **Seedance** (`seedance-*`, including `seedance-2.0`, `seedance-v1-pro`, `seedance-2.0-ref`, `seedance-pro`, etc.):

- **Always** ask the user how many shots to use for any duration ≥ 8s, before writing the prompt.
- **Always** render the final `mainPrompt`(s) using Timeline Prompting structure — clock-pinned beats, per-shot when multishot.

This becomes a hard Seedance rule, not a user toggle.

## Changes

### 1. `supabase/functions/director-agent/index.ts` — system prompt rules

Add a dedicated **"Seedance protocol"** block to the system prompt (near the existing model-ranking / story-mode rules):

- After model is resolved to any `seedance-*` id AND `duration_seconds >= 8`, the next agent turn MUST be `ask_clarification` with the question "How many shots should I split these {N}s into?" and chips: `1 shot (one continuous take)`, `2 shots`, `3 shots`, `4–5 shots`, `Let the Director decide`. Skip this question only if the user already named a shot count in the brief (e.g. "3-shot ad", "single take") or it's Story mode (already locked to 4).
- Persist the chosen count in the plan as `shot_count` so the orchestrator and multi-shot pipeline use it.
- Every Seedance prompt the agent emits (single shot or per-shot in a storyboard) MUST be authored in **Timeline Prompting** structure: `TIMELINE` (clock-pinned beats), `EFFECTS INVENTORY`, `DENSITY MAP`, `ENERGY ARC` — same shape as `timelineAddendum()` in `_base.ts`. Inline the structure rules so the agent can produce it directly instead of relying on the toggle in `generate-prompt`.
- Negative-prompt + signature-moment guidance copied from the existing addendum.

### 2. `supabase/functions/generate-prompt/index.ts` — auto-enable for Seedance

When the agent (or any caller) hits `generate-prompt` with `targetModel` starting with `seedance`, force `timelineEnabled = true` regardless of what the body sends. This guarantees the structured output even on legacy code paths.

### 3. `src/lib/modelContracts.ts` — make Seedance "timeline-mandatory"

Add a sibling helper `timelineMandatory(model)` (Seedance-only for now). Update `src/components/WorkflowPanel.tsx` so when the model is Seedance the timeline toggle is **forced on, disabled, and labeled "Required for Seedance"** instead of being optional — keeps the legacy panel consistent with the new Director rule.

### 4. `src/lib/director/plan.ts` (+ types) — store `shot_count`

Add `shot_count?: number` to the plan schema so the answer from step 1 is captured and visible in the Shots strip and in `OrchestratorDebugPanel` (so the same dry-run check you saw will report `plan.shotCount`).

### 5. Tests

- Add a director-agent unit/integration test: given a Seedance pick + 15s, the next turn is `ask_clarification` with shot-count chips.
- Add a `generate-prompt` test: Seedance + no `timelineEnabled` → response still includes `TIMELINE` / `EFFECTS INVENTORY` headers.

## Out of scope

- No changes to Veo/Kling prompt structure (they still use Timeline only when the user opts in).
- No changes to billing/credit math; shot count already feeds existing cost estimator.
- Story mode stays locked at 4 acts; the new question is skipped there.

## Files touched

- `supabase/functions/director-agent/index.ts` (system prompt + new rule block)
- `supabase/functions/generate-prompt/index.ts` (force timeline for Seedance)
- `supabase/functions/generate-prompt/experts/_base.ts` (export the rule text so director-agent can import it — single source of truth)
- `src/lib/modelContracts.ts` (`timelineMandatory` helper)
- `src/components/WorkflowPanel.tsx` (forced-on UI state)
- `src/lib/director/plan.ts` + `src/components/director/OrchestratorDebugPanel.tsx` (surface `shot_count`)
- Tests under `supabase/functions/**/__tests__` and `src/lib/director/__tests__`
