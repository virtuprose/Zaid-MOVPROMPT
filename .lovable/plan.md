## Fix: Seedance 2.0 Reference is also a multi-reference model

You're right. `seedance-2.0-ref` accepts up to 9 reference images (already enforced in `DirectorChat.tsx` line 461, 678) — so Kling Omni isn't "the only" model that can ingest multiple references and storyboard them. The Director's playbook just doesn't list it as a peer, so it always picks Kling Omni and writes that one-liner.

### Changes (one file: `supabase/functions/director-agent/index.ts`)

1. **Step 1 — Input gating** (line 74)
   Change:
   > "If the user attached IMAGES of characters/products that MUST stay consistent across shots → strongly prefer `kling-omni` (multi-reference + named elements)."
   
   To list both multi-reference models and let Step 3 break the tie:
   > "If the user attached IMAGES of characters/products that MUST stay consistent across shots → keep only multi-reference models: `kling-omni` and `seedance-2.0-ref` (both accept multiple named/numbered reference images). Let Step 3 rank between them."

2. **Step 3 — Aesthetic ranking** (line 87)
   Change:
   > "multi-shot storyboard with recurring characters → kling-omni > kling-v3-pro"
   
   To:
   > "multi-shot storyboard with recurring characters → kling-omni > seedance-2.0-ref > kling-v3-pro (prefer seedance-2.0-ref when the look is cinematic film-grade or needs non-standard aspect ratios; prefer kling-omni when shots need named element references + tight identity lock across many cuts)."

3. **`recommendation_reason` example** so the Director stops writing "the only model built to…":
   Add a note near line 96 / line 119 reminding it: "Never claim a model is 'the only' option for multi-reference — both `kling-omni` and `seedance-2.0-ref` support multiple reference images. Phrase the reason as a comparative trade-off."

No frontend changes needed — the recommendation string is written by the model, so fixing the system prompt fixes the line you saw.