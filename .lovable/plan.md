## Goal

Refresh the **MovPrompt → "Pick your target AI model"** dropdown so it reflects the full current catalog (including the missing **Kling 2.1 Master**), and add a small **AUDIO** badge on every row whose model supports native audio. Nothing else about the picker UX changes.

## What's broken today

The picker is driven by `src/lib/models.ts`, which is hand-maintained and has drifted away from the actual catalog in `supabase/functions/_shared/videoModelCatalog.ts`. Today the picker is missing:

- **Kling**: 3.0 Pro, 3.0 Standard, 3.0 4K, 2.1 Master, 2.0 Master, 1.6 Pro, 1.6 Standard
- **Google Veo**: Veo 2
- Other current Seedance variants (Seedance 1 Pro / 1 Lite / 2.0 Reference)

There's also no visual cue for which models can generate native audio (dialogue, SFX, music), even though it's the #1 thing users want to know before picking.

## Changes

### 1. Refresh the model list (`src/lib/models.ts`)

Add an `audio?: boolean` field to `ModelOption`. Replace the three groups with the up-to-date set, ordered newest/flagship → legacy:

- **Kuaishou (Kling)** — 3.0 Pro · 3.0 Standard · 3.0 4K · 3.0 Omni · 3.0 Omni Edit · 3.0 Motion Control · 2.5 Turbo Pro · **2.1 Master** · 2.0 Master · 1.6 Pro · 1.6 Standard
- **Google Veo** — Veo 3.1 · Veo 3.1 Fast · Veo 3.1 Lite · Veo 3 · Veo 3 Fast · Veo 2 · Gemini Omni Flash (gated)
- **ByteDance (Seedance)** — Seedance 2.0 · Seedance 2.0 Fast · Seedance 2.0 Reference · Seedance 1 Pro · Seedance 1 Lite

Audio flag set per the shared catalog:
- **Audio**: All Kling 3.0 family (Pro / Standard / 4K / Omni / Omni Edit) · all Veo 3 + 3.1 family · Seedance 2.0 family · Gemini Omni Flash
- **No audio**: Kling 2.5 Turbo and older · Kling 3.0 Motion Control · Veo 2 · Seedance 1 Pro / Lite

### 2. Show an AUDIO badge in the picker (`src/components/ModelPicker.tsx`)

In `ModelRow`, add a small pill next to the existing variant/flagship pills:

```text
Kling 3.0  [FLAGSHIP] [AUDIO]
Veo 3.1    [FLAGSHIP] [AUDIO]
Kling 2.1 Master      (no audio badge)
```

Pill style: outline with the cyan primary (matches existing pill grammar), the speaker-volume `Volume2` icon from lucide, label `AUDIO`. Only rendered when `model.audio === true`. The "Any Model" row is unchanged.

### 3. Hook up i18n descriptions

Add `models.desc.*` keys for every newly-added model in `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts`, using the one-liner from the shared catalog as the source of truth. Same tone as the existing entries.

### 4. Update sorting ranks

Extend `MODEL_RANKS` and `TIER_OVERRIDES` in `ModelPicker.tsx` so the new IDs sort sensibly under the **Quality / Speed / Price** tabs (e.g. Kling 2.1 Master = high-quality / mid-speed / high-price). Kling 3.0 Pro becomes the flagship anchor of the family.

## Out of scope

- No change to backend `generate-prompt`, `generate-video`, or the shared playbook — those already know every model.
- No change to the picker layout, search, or sort UI.
- No new filter (e.g. "Audio only" toggle). If you want one I can add it in a follow-up.