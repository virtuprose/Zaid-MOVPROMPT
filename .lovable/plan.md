
## Faster preset previews — switch model + add per-card model selector

Default to a faster Fal model so most previews finish in **20–45s** instead of 60–180s, and let admins override per-generation when they want Kling's quality.

### What changes

**1. `supabase/functions/generate-preset-preview/index.ts`**

- Add a small model registry at the top:
  ```ts
  const FAL_MODELS = {
    "ltx-fast":   { url: "https://queue.fal.run/fal-ai/ltx-video",                 label: "LTX (fastest, ~20s)",  defaultDuration: "5", aspect: "16:9" },
    "wan-fast":   { url: "https://queue.fal.run/fal-ai/wan/v2.2-5b/text-to-video", label: "Wan 2.2 5B (~30s)",   defaultDuration: "5", aspect: "16:9" },
    "kling-std":  { url: "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video", label: "Kling v1 Standard (~90s, best quality)", defaultDuration: "5", aspect: "16:9" },
  } as const;
  type ModelKey = keyof typeof FAL_MODELS;
  const DEFAULT_MODEL: ModelKey = "ltx-fast";
  ```
- `submit` action accepts an optional `model` field. Validate it's a known key; fall back to `DEFAULT_MODEL`. Return the chosen `model` in the submit response so the client can label the card.
- Build the Fal request body per model (LTX/Wan accept `prompt` + `aspect_ratio`; some don't take `duration` — only include fields the model supports). Keep `prompt` resolution (`HERO_PROMPTS` / `buildDynamicPrompt`) unchanged.
- `poll` action accepts the same `model` so it hits the right `statusUrl`/`responseUrl` (these are full URLs returned by Fal, so this is mostly a sanity field; no logic change needed beyond carrying it through error messages).
- Surface the model in error/debug responses (`code: "fal_error"` messages) so admins can tell which engine failed.
- No DB changes. No storage changes. Output path stays `<presetId>.mp4` (one canonical preview per preset, regardless of which model produced it — replacing on regeneration is the existing behavior).

**2. `src/components/admin/PresetPreviewsSection.tsx`**

- Add a small `Select` in the card header (next to "New Preset") labeled **Model**, with three options matching the registry. Default: `ltx-fast`. Persist choice in `localStorage` (`preset-previews:model`) so it sticks across sessions.
- Pass the selected `model` into the `submit` invoke body.
- Per-card "Generating…" badge shows the model label + an elapsed-time counter (`0:23`) so the wait reads as intentional. No change to the existing polling loop or storage refresh.
- Add a one-line caption under the selector: *"LTX is fastest. Switch to Kling for the highest-quality reference clips."*

**3. i18n (EN + AR)**
- `presetPreviews.model` → `Model`
- `presetPreviews.modelHelper` → `LTX is fastest. Switch to Kling for the highest-quality reference clips.`
- `presetPreviews.elapsed` → `{time} elapsed`

### Out of scope
- Webhooks (declined earlier).
- Storing per-preset "which model produced this" metadata.
- Bulk generate.

### Files touched
- `supabase/functions/generate-preset-preview/index.ts`
- `src/components/admin/PresetPreviewsSection.tsx`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`
