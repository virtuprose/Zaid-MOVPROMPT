## Goal

Upgrade the AI Director's knowledge of every video model in the picker so it can pick the right one with confidence and explain *why*. Today the agent only sees a one-line spec per model (`id — family, max duration, max resolution, audio?, strengths`). That's enough to filter by capability but not enough to know *what each model actually does well, what inputs it needs, and when to prefer it over a sibling*.

## What to change

All work is in `supabase/functions/director-agent/index.ts`. No other files change.

### 1. Replace the compact catalog with a structured "Model Playbook"

Today: `MODEL_CATALOG_LINES` — one cryptic line per model.

New: a per-model rich entry the agent reads on every turn, with these fields:

- **id** (unchanged, enum source for `recommended_model_id`)
- **family + tier** (e.g. "Kling 3.0 / Omni tier")
- **input mode**: `text-to-video` | `image-to-video` | `reference-to-video (image+elements)` | `video-to-video edit` | `motion-control (image+driving-video)`
- **required inputs**: what the user must drop before this model can run (e.g. Omni Edit → "source video", Motion Control → "1 reference image + 1 driving video")
- **duration**: exact allowed values (enum or range)
- **aspect ratios**: exact allowed set
- **resolution**: native max
- **audio**: none / native generation / preserve-source-only
- **best for**: 2–4 concrete shot types ("dialogue close-ups", "VFX-heavy action", "vertical TikTok product loops")
- **avoid for**: known weaknesses ("long takes >8s", "complex multi-character interactions", "text in frame")
- **prefer over siblings when…**: a one-line tiebreaker vs the next closest model in the same family

The full playbook ships inline in the system prompt so the LLM sees it every call. To keep tokens manageable each entry is ~5–7 short lines, total ~5–7k tokens for ~30 models — well within Gemini/GPT context.

### 2. Add a "Model Selection Algorithm" block

Replace the current ad-hoc rules with an explicit decision tree the agent must follow before picking `recommended_model_id`:

```text
STEP 1 — Input gating (hard filter)
  • If the user attached a SOURCE VIDEO to edit/restyle → only kling-omni-edit qualifies.
  • If the user wants a character to copy motion from another clip → only
    kling-motion-control qualifies (needs 1 reference image + 1 driving video).
  • If the user attached IMAGES of characters/products to keep consistent across
    shots → strongly prefer kling-omni (multi-reference + elements).
  • Otherwise text-to-video models are all eligible.

STEP 2 — Capability gating (hard filter)
  • Drop any model whose max duration < requested duration.
  • Drop any model whose aspect ratios don't include the requested ratio.
  • If audio/dialogue is required, keep only audio-capable models
    (veo-3/3.1 family, seedance-2.0/2.0-fast, kling-v3 family, kling-omni).
  • If native 4K is explicitly requested, keep only kling-v3-4k.

STEP 3 — Aesthetic ranking (soft score)
  Score remaining models by overlap between the brief's tags and the model's
  "best for" list, then break ties with cost/speed:
    • photoreal dialogue close-up → veo-3.1 > seedance-2.0 > kling-v3-pro
    • cinematic film-look wide shot → seedance-2.0 > kling-v3-pro > veo-3.1
    • anime / stylized portrait → hailuo-02-pro > seedance-v1-lite > ltx-video-13b
    • multi-shot storyboard with characters → kling-omni > kling-v3-pro
    • fast cheap iteration → veo-3.1-lite / seedance-2.0-fast / wan-v2.2-a14b
    • VFX-heavy action / complex motion → kling-v2.5-turbo-pro > kling-v3-pro

STEP 4 — Output
  • recommended_model_id = top of the ranked list.
  • recommended_alternatives = #2 and #3 from the same ranked list, never
    duplicates of #1.
  • recommendation_reason = one sentence naming the deciding factor
    (e.g. "Native audio + 8s dialogue support, 1080p photoreal close-up").
```

### 3. Tighten the routing-question rules to cover input-mode questions

Today the agent asks about *duration / audio / aspect ratio*. Add a 4th routing axis:

- **Input mode** — if the brief mentions "edit this video", "make my character do X like in this clip", or "keep this character consistent across shots", the agent should confirm intent before locking in `kling-omni-edit` / `kling-motion-control` / `kling-omni` (since those need extra uploads). Question shape: "Do you want to **restyle this exact clip**, **drive a character with this clip's motion**, or **generate a fresh video inspired by it**?"

This question goes through the existing `ask_clarification` flow and respects the existing media-coherence rule (don't mix with unrelated routing asks).

### 4. Sync supporting copy

- Update the `AVAILABLE MODELS` section header to reference the new playbook format.
- Update `breakdown.recommendation_reason` description to require it name the deciding factor from the algorithm (input mode / capability gate / aesthetic match).
- Leave the `MODEL_IDS` enum derivation as-is — it stays the source of truth for the tool schema.

## Technical details

- File touched: `supabase/functions/director-agent/index.ts` only.
- Constant rename: `MODEL_CATALOG_LINES` → `MODEL_PLAYBOOK` (array of objects), with a `playbookPromptBlock()` helper that serializes it into the system prompt.
- `MODEL_IDS` becomes `MODEL_PLAYBOOK.map(m => m.id)`.
- No schema changes to the `generate_prompt` tool — same `recommended_model_id` / `recommended_alternatives` / `recommendation_reason` fields.
- After the edit, redeploy `director-agent` via the edge-function deploy tool.

## Out of scope

- No changes to the picker UI, capability catalog, or generate-video edge function (already done in prior turns).
- No new input upload plumbing for Omni Edit / Motion Control (still tracked separately).
- No new models added.