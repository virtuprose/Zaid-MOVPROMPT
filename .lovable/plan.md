# Smarter model recommendation with structured catalog + ranked fallback

## Goal

Replace the current "LLM picks one of 3 hardcoded names → regex maps to id" flow with a system where:

1. The Director LLM sees the **full catalog** (all ~25 models) with structured capability tags and picks a concrete `model_id` directly.
2. The frontend computes its **own ranked shortlist** from the scene breakdown, so when the LLM's pick is missing/ambiguous/unavailable we always have a deterministic fallback — and we can surface a "Top picks" group in the dropdown.

## Part 1 — Structured model catalog

### New file: `src/lib/director/videoModelCatalog.ts`

Extend each entry from `videoModels.ts` with capability metadata used for both the LLM prompt and the ranking heuristic:

```ts
type ModelCapabilities = {
  id: VideoModelId;
  family: VideoModel["family"];
  label: string;
  // Capabilities
  audio: boolean;                      // native audio generation
  maxDurationSec: number;              // 5 | 8 | 10 | …
  maxResolution: "480p"|"720p"|"768p"|"1080p";
  aspects: string[];                   // ["16:9","9:16",…]
  speed: "fast"|"balanced"|"slow";     // generation latency tier
  cost: "low"|"mid"|"high";            // relative price tier
  // Qualitative tags used for matching
  strengths: Array<
    | "cinematic" | "photoreal" | "stylized" | "anime"
    | "portrait" | "product" | "landscape" | "action"
    | "complex_motion" | "stable_subject" | "long_take"
    | "film_grain" | "text_in_frame" | "dialogue"
  >;
};
```

Filled out for all 25 models. Examples:
- `veo-3.1`: audio ✓, 8s, 1080p, photoreal+dialogue+complex_motion, slow, high
- `seedance-2.0`: audio ✓, 10s, 1080p, cinematic+photoreal+film_grain, balanced, mid
- `kling-v2.5-turbo-pro`: no audio, 10s, photoreal+complex_motion+long_take, balanced, mid
- `hailuo-02-pro`: no audio, 10s, 1080p, stylized+portrait, balanced, mid
- `ltx-video-13b`: no audio, 5s, 720p, stylized, fast, low
- `runway-gen3-turbo`: no audio, 10s, photoreal+cinematic, fast, mid

This file becomes the single source of truth; `videoModels.ts` keeps its existing `VIDEO_MODEL_GROUPS` shape but is built from the catalog.

## Part 2 — LLM picks a concrete model_id

### Edit: `supabase/functions/director-agent/index.ts`

- Stop hardcoding `VIDEO_MODELS = ["Seedance Pro","Veo 3","Kling 2"]`.
- At request time, build a compact catalog string (one line per model: `id — family, max Ns, [audio], strengths…`) and inject it into the system prompt.
- Tighten the `generate_prompt` tool schema so the breakdown returns **two new structured fields** alongside the existing free text:

```ts
breakdown.recommended_model_id: string  // must be one of the catalog ids
breakdown.recommended_alternatives: string[]  // 2–3 backup ids, ranked
breakdown.recommendation_reason: string  // one sentence "why"
```

The existing `model_recommendation` free-text field stays (for display), but the source of truth becomes the structured ids.

## Part 3 — Deterministic fallback ranking on the client

### New file: `src/lib/director/modelRanking.ts`

A pure function:

```ts
function rankModels(breakdown: Breakdown): Array<{ model: ModelCapabilities; score: number; reasons: string[] }>
```

Scoring rules (additive, all bounded so no single signal dominates):

```text
+3  audio required (mood/film_emulation mentions music, dialogue, sound, voice, ambient) AND model has audio
-4  audio required AND model lacks audio
+2  duration_hint ≥ 8s AND model.maxDurationSec ≥ that hint
-3  duration_hint exceeds model.maxDurationSec
+2  scene tag match (e.g. "portrait" subject → portrait strength; "action" verbs → action/complex_motion)
+1  film_emulation present AND model has film_grain or cinematic
+1  resolution hint "4k"/"1080" AND model.maxResolution = "1080p"
+1  speed preference: short brief / "quick" / "draft" → fast tier
-1  cost: prefer mid over high when no signal demands top quality
+0.5 family hint in model_recommendation free text matches
```

Tag detection is plain regex/keyword on `breakdown.{subject, action, mood, environment, color_palette, film_emulation, model_recommendation}`. Scores are deterministic and explainable (`reasons[]` lists which rules fired — useful for tooltips and debugging).

### Resolution flow used by `PromptResultCard`

Replace `pickRecommendedModel(rec)` with `resolveRecommendation(breakdown)`:

1. If `breakdown.recommended_model_id` exists in the catalog → that's the **primary**.
2. Compute `rankModels(breakdown)` to get the ranked list.
3. Primary's **alternatives** = first 3 ranked entries (excluding primary, deduped against `recommended_alternatives` if present).
4. If the LLM's primary is missing/invalid → top-ranked entry becomes primary, and the ranking provides alternatives. Fallback path also fires when the free-text recommendation is ambiguous (e.g. just "Kling" with no version → ranking decides which Kling).
5. Returns `{ primary, alternatives, reasons }`.

## Part 4 — UI surfacing

### Edit: `src/components/director/PromptResultCard.tsx`

- Dropdown gains a new "Top picks" section above "Recommended": shows primary + 2 alternatives with a small `?` tooltip listing the matched reasons (e.g. "Has audio · Supports 10s · Cinematic strength").
- Existing "Recommended" item keeps the LLM's pick (which is now usually the same as primary).
- Full grouped list of all models stays underneath, unchanged.
- "Model recommendation" section in the card body shows `recommendation_reason` from the breakdown when present, falling back to the old free-text line.

## Part 5 — Tests

### New file: `src/lib/director/__tests__/modelRanking.test.ts`

Cover the deterministic-ranking guarantees:
- Brief mentioning "dialogue" forces audio-capable models above Kling/Runway/LTX/Wan.
- `duration_hint: "10s"` filters out Veo 3 (8s max).
- Free-text `"Kling"` with no version resolves to the highest-ranked Kling, not the first in list order.
- When primary id is invalid, the top-ranked model is promoted and surfaces in the UI shortlist.

## Out of scope

- No DB schema changes (everything fits in the existing `breakdown` JSON).
- No changes to the per-model render-settings dialog from the previous plan — it already keys off model id.
- No automated benchmarking of model output quality; this plan is about *matching* user intent to model capabilities, not measuring real-world fidelity.
