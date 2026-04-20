
## Answer — Does the Seedance agent handle all Seedance models?

**Yes.** The Seedance specialist in `supabase/functions/generate-prompt/experts/seedance.ts` matches every model whose value starts with `seedance` and applies a unified shooting-script ruleset with mode-based branches expressed inside the system addendum.

### How routing works

1. **Registry match** (`experts/registry.ts`): `seedanceAgent.matches(model)` returns true for any `model.startsWith("seedance")`. All 5 Seedance entries in `src/lib/models.ts` flow into the Seedance agent.
2. **Single `systemAddendum`** (like Veo, unlike Kling): per-variant tuning is conditional inside the addendum, not a separate helper function. Two named modes — **STITCHED MULTI-SHOT** and **@ELEMENT REFERENCE** — gate behavior by model family.

### Variant coverage matrix

| Model value            | Mode capability                                  | Word target / structure |
|------------------------|--------------------------------------------------|--------------------------|
| `seedance-2.0`         | @element references; single-shot script          | Full cinematic shooting script |
| `seedance-2.0-fast`    | @element references; single-shot script          | Compact shooting script |
| `seedance-1.5-pro`     | Single-shot script; legacy tier                  | Standard length |
| `seedance-pro`         | **Stitched multi-shot mode** (numbered cuts)     | Full multi-cut script |
| `seedance-pro-fast`    | **Stitched multi-shot mode**, compact            | Compact multi-cut script |

Shared mandatory rules across all variants:
- **Shooting-script `mainPrompt`** with sequence blocks, numbered cuts, camera/lens, lighting, color grading.
- **Audio block** — DIALOGUE / SFX / AMBIENT (Seedance supports synced audio).
- **`shotStructure`** populated with cut-by-cut breakdown.
- **`referenceGuidance`** explaining anchor frame + element refs.
- **Negative prompt** with Seedance-specific artifacts.
- **`cameraTags`** left empty — Seedance uses prose camera specs, not bracketed tags.

### Mode-specific behavior baked into the addendum

- **STITCHED MULTI-SHOT MODE** (Pro / Pro Fast): triggered when model contains `pro`. Output is a numbered cut sequence (CUT 1, CUT 2…) with explicit transitions and continuity locks between cuts.
- **@ELEMENT REFERENCE MODE** (2.0 / 2.0 Fast): triggered when model starts with `seedance-2.0`. Element references from the `ElementGrid` are addressed by `@name` tokens in `mainPrompt` and explained in `referenceGuidance`.
- **1.5 Pro**: standard single-shot script, no special mode.

### End-to-end flow per request

```text
user picks seedance-* model ──▶ generate-prompt edge fn
                                   │
                                   ▼
                     registry.getAgent(model)
                                   │
                                   ▼
                       seedanceAgent selected
                                   │
                                   ▼
              base systemAddendum (universal Seedance rules:
              shooting script + audio + shotStructure)
                                   │
              mode tuning happens via natural-language
              conditionals INSIDE the addendum:
                • Pro / Pro Fast → stitched multi-shot mode
                • 2.0 / 2.0 Fast → @element reference mode
                • 1.5 Pro → standard single-shot
                                   │
                                   ▼
                    combined system prompt sent
                    to Lovable AI Gateway
```

### Comparison with Kling and Veo
- **Kling** — `getKlingVariantHints()` helper with 4 workflow shapes (Standard / Edit / Motion Control / Multi-shot) + engine-tier overlays. Most complex.
- **Seedance** — single addendum with 2 named modes (Stitched Multi-shot, @Element Reference) gated by model name. Medium complexity.
- **Veo** — single addendum, only word-budget + sustained-motion conditionals. Simplest.

### Gaps / caveats
- None functional. All 5 entries in `src/lib/models.ts` under the ByteDance group route correctly.
- If a future Seedance variant introduces a new workflow shape (e.g. an explicit Edit mode), promoting the conditionals into a `getSeedanceVariantHints()` helper — mirroring Kling — would keep the addendum readable.

No code changes — status answer.
