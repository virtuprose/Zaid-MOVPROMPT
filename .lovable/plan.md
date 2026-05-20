# Timeline Prompting toggle

Add a user-facing on/off switch shown right above the **Generate Cinematic Prompt** button. When enabled, the prompt is rewritten as a beat-by-beat timeline (clock-pinned actions, camera, light, audio, transitions, effects inventory, density map, energy arc) following the skill spec in the brief.

Eligible models (toggle hidden for everything else, like an image-edit model):
- Any `seedance*` (Pro, Pro Fast, 2.0, 2.0 Fast, base, Fast variants)
- Any `kling*` (3.0, 3.0 Omni, 2.6, Motion-Control — excluding pure Edit)
- Any `veo-3.1*` (Google / "Gemini Omni" family)
- Also surface on the **Any Model** (Universal Prompt) flow, since it can resolve to one of the above

Default state: **off** (timeline is an advanced technique; on by default would surprise existing users). Selection persists per session via `localStorage` (key `movprompt.timelinePrompting`).

## UI

In `src/components/WorkflowPanel.tsx`, next to the existing inline **Audio** pill in the collapsed model strip (and again right above the Generate button on the breakdown/generate phase), add a compact pill:

```
[ ⏱  Timeline  ●——  ]   ⓘ
```

- Same visual treatment as `audioInlineToggle` (sub-tab pill, `aria-pressed`, accent when on).
- Tooltip: *"Break the scene into clock-pinned beats with camera, light, and audio per timestamp. Best for Seedance, Kling, and Veo."*
- Hidden when `!supportsTimeline(selectedModel)`.

## Contract change

`src/lib/modelContracts.ts`:
- Add `supportsTimeline?: boolean` to `ModelContract`.
- Set `true` for: `any`, all kling variants except pure `kling-*-edit`, all seedance variants, all `veo-3.1*`.

## Wiring to generate-prompt

`src/components/WorkflowPanel.tsx` (around line 558):
- Add a `timelineEnabled` state (read/write `localStorage`).
- Pass `timelineEnabled: contract.supportsTimeline ? timelineEnabled : undefined` in the `supabase.functions.invoke("generate-prompt", { body: ... })` call.

`supabase/functions/generate-prompt/index.ts`:
- Accept new `timelineEnabled: boolean` in the request body.
- When `true`, append a **Timeline Prompting addendum** to the system prompt for the resolved expert agent (Kling / Seedance / Veo / Generic). The addendum is the exact spec the user pasted (Role, Global Rules, Output Structure: TIMELINE / EFFECTS INVENTORY / DENSITY MAP / ENERGY ARC, beat-writing rules, duration calibration).
- Duration source for calibration: derive from the model's default/locked duration (`videoModelControls`), defaulting to 10s.
- For **multi-shot** workflows, generate the timeline **per shot** (each shot gets its own beat list scaled to its sub-duration).
- Echo `timelineEnabled` in the returned `meta` so the UI can show a "Timeline" badge on the result card.

## Files touched

- `src/lib/modelContracts.ts` — add `supportsTimeline`, populate per family.
- `src/components/WorkflowPanel.tsx` — state + toggle UI + payload field.
- `src/i18n/translations/en.ts` + `ar.ts` — add `wp.timelinePrompting`, `wp.timelinePromptingHint`.
- `supabase/functions/generate-prompt/index.ts` — read `timelineEnabled`, branch into timeline addendum.
- `supabase/functions/generate-prompt/experts/_base.ts` (or each expert) — export `timelineAddendum()` builder so all three expert agents share one source of truth.

## Out of scope

- No toggle in the Director chat composer (Director already drives beats conversationally; can be added in a follow-up if you want it there too).
- No change to `generate-video` (timeline lives in the prompt text the video model consumes).
- No new credits cost; same generation pricing.

## Verification

1. Pick `seedance-2.0` → toggle appears, defaults off, flips on, persists on reload.
2. Pick `kling-3.0-omni` → toggle appears.
3. Pick `veo-3.1` → toggle appears.
4. Pick `grok-imagine-edit` → toggle hidden.
5. Toggle on + Generate → returned prompt contains the four sections (TIMELINE / EFFECTS INVENTORY / DENSITY MAP / ENERGY ARC) with timestamps matching the model's duration.
6. Multi-shot on Seedance Pro → each shot has its own timeline.