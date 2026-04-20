
## Answer — Does the Kling agent handle all Kling models?

**Yes.** The Kling specialist agent in `supabase/functions/generate-prompt/experts/kling.ts` matches every model whose value starts with `kling` and routes each variant through tailored logic.

### How routing works

1. **Registry match** (`experts/registry.ts`): `klingAgent.matches(model)` returns true for any `model.startsWith("kling")`. All 9 Kling entries in `src/lib/models.ts` flow into the Kling agent.

2. **Base Kling rules** (`systemAddendum`): applied to every variant — 80–180 words, one `[camera:*]` tag, action-verb opening, no audio, mandatory negative prompts.

3. **Variant-specific hints** (`getKlingVariantHints`): appended on top of base rules, picked by substring match on the model ID.

### Variant coverage matrix

| Model value                     | Branch triggered                          | Special behavior |
|---------------------------------|-------------------------------------------|------------------|
| `kling-3.0`                     | Standard + 3.0 note                       | Strongest cinematic motion. Multi-shot workflow unlocks the 10-beat arc branch. |
| `kling-3.0-omni`                | Standard + 3.0 note                       | Richer multi-subject scenes allowed. |
| `kling-3.0-omni-edit`           | Edit variant                              | Surgical transform prompts under 60 words, no scene re-description. |
| `kling-2.6`                     | Standard + 2.6 legacy note                | Single-subject/single-action, simpler motion. |
| `kling-2.5-turbo`               | Standard + 2.5 Turbo note                 | Tight 80–140 words, speed-optimized legacy. |
| `kling-o1-video`                | Standard + O1 enhancement                 | Up to 220 words, multi-subject choreography. |
| `kling-o1-video-edit`           | Edit variant + O1 enhancement             | Edit rules + O1 reasoning notes. |
| `kling-motion-control`          | Motion Control variant                    | 3-waypoint camera path, LOCKED/MOVING tagging. |
| `kling-3.0-motion-control`      | Motion Control variant                    | Same as above; 3.0 engine. |

Plus: **Kling 3.0 + Multi-Shot workflow** triggers a dedicated 10-beat storyboard branch that outputs N self-contained shots with locked continuity blocks.

### End-to-end flow per request

```text
user picks model ──▶ generate-prompt edge fn
                       │
                       ▼
            registry.getAgent(model)
                       │
                       ▼
              klingAgent selected
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
 base systemAddendum      getKlingVariantHints(
 (universal Kling rules)     model, workflowType, shotCount)
                                    │
                         routes to ONE of:
                         • Multi-shot 10-beat
                         • Motion Control
                         • Edit
                         • Standard
                         then layers: O1 / 2.5 Turbo / 2.6 / 3.0 note
                                    │
                                    ▼
                        combined system prompt sent
                        to Lovable AI Gateway
```

### Gaps / caveats
- None functional. Every model listed in `src/lib/models.ts` under the Kuaishou group has a matching branch.
- `kling-2.5-turbo` uses the standard generation flow (not edit/motion-control) — correct, since Turbo is a speed variant of base generation.

No code changes needed — this is a status answer. If you want me to add anything (e.g. a new variant, or to expose the variant routing in admin UI), say the word and I'll plan it.
