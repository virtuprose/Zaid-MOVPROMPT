
## Answer — Does the Veo agent handle all Veo models?

**Yes.** The Veo specialist in `supabase/functions/generate-prompt/experts/veo.ts` matches every model whose value starts with `veo` and applies a unified rule set with light per-variant guidance baked into the system prompt.

### How routing works

1. **Registry match** (`experts/registry.ts`): `veoAgent.matches(model)` returns true for any `model.startsWith("veo")`. All 5 Veo entries in `src/lib/models.ts` flow into the Veo agent.
2. **Single `systemAddendum`**: applied to every Veo variant — no separate `getVeoVariantHints` helper like Kling has. Per-variant tuning is expressed as conditional instructions inside that one addendum.

### Variant coverage matrix

| Model value      | Word target         | Special behavior baked into the addendum |
|------------------|---------------------|------------------------------------------|
| `veo-3`          | 150–250 words       | Full structure SCENE → ACTION → CAMERA → LIGHTING; native audio block required. |
| `veo-3-fast`     | 100–150 words       | `modelNotes` must flag that prompt was kept compact for Fast. |
| `veo-3.1`        | 150–250 words       | `modelNotes` must emphasize **sustained-motion** guidance — what continues uninterrupted across the clip. |
| `veo-3.1-fast`   | 100–150 words       | Compact + sustained-motion note. |
| `veo-3.1-lite`   | 100–150 words       | Compact + sustained-motion note. Lowest fidelity tier. |

All variants share these mandatory rules:
- **Audio block** — DIALOGUE / SFX / AMBIENT (Veo generates native synced audio; this is the biggest differentiator vs Kling/Seedance).
- **Real focal lengths** (e.g. "50mm f/2.0", "35mm anamorphic").
- **Named director/DP styles** when fitting (Deakins, Kubrick, Malick, Lubezki).
- **Reference guidance** explaining how the uploaded image anchors start frame + character likeness.
- **Negative prompt additions**: `temporal artifacts, scene drift, sudden lighting change, lip-sync mismatch, audio-video desync`.
- **Empty fields**: `cameraTags`, `shotStructure` — Veo doesn't use bracketed camera tags.

### End-to-end flow per request

```text
user picks veo-* model ──▶ generate-prompt edge fn
                              │
                              ▼
                 registry.getAgent(model)
                              │
                              ▼
                     veoAgent selected
                              │
                              ▼
              base systemAddendum (universal Veo rules)
                              │
              variant tuning happens via natural-language
              conditionals INSIDE the addendum:
                • word target by Fast/Lite vs full
                • sustained-motion emphasis for 3.1*
                              │
                              ▼
                combined system prompt sent
                to Lovable AI Gateway
```

### Comparison with Kling
- **Kling** uses a separate `getKlingVariantHints()` helper because it has 4 distinct workflow shapes (Standard / Edit / Motion Control / Multi-shot) plus engine-tier overlays (O1 / 2.5 Turbo / 2.6 / 3.0).
- **Veo** is simpler — all 5 variants share the same workflow shape (image-to-video with native audio), differing only in **word budget** and **sustained-motion emphasis**. So one addendum with conditional sentences is enough.

### Gaps / caveats
- None functional. All 5 entries in `src/lib/models.ts` under the Google group route correctly.
- If Google releases a new variant with a different shape (e.g. a Veo "Edit" or "Reference-character" mode), we'd want to add a `getVeoVariantHints()` helper mirroring the Kling pattern. Today, that's not needed.

No code changes — status answer.
