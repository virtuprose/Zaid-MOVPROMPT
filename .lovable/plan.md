## Goal

When the user picks a product (brand) and/or an avatar (character), they should appear as visual chips inside the describe-box area — like the `Haribo can…` and `Stefan` chips in the reference. The render should then actually use those reference images, not just mention them in the text prompt.

## Scope

`src/pages/MarketingStudio.tsx`, `src/lib/director/api.ts`, `supabase/functions/generate-video/index.ts`.

## 1. Reference chips above the textarea

In the composer card (around line 367), extend the existing chip row that already shows the Location chip so it also shows:

- A **Product/App chip** whenever `brandKit` is selected — thumbnail (`brandKit.logo_url`) + truncated brand name + ✕ to detach (calls `setBrandActive(null)`).
- An **Avatar chip** whenever `characterKit` is selected — thumbnail (`characterKit.reference_url`) + character name + ✕ to detach (calls `setCharacterActive(null)`).
- Keep the existing Location chip as-is.

Chip styling matches the existing location chip: `h-9`, rounded, small thumbnail tile on the left, label, dismiss button. The row only renders when at least one of brand/character/location is present.

The right-side picker tiles (Product / Avatar / Generate) stay where they are — they remain the way to *pick* a kit. The chips are a clear "what's attached" indicator at the top, mirroring the reference screenshot.

## 2. Use the reference images at render time

Today `doGenerate` only sends a text prompt to `seedance-2.0` (text-to-video). The brand logo and character photo are mentioned in text but never sent as images, so the model can't actually match the product or face.

Changes:

- **Client (`MarketingStudio.tsx` → `doGenerate`)**: collect `referenceImages: string[]` from `brandKit?.logo_url` and `characterKit?.reference_url` (filter falsy). Pass them through a new `referenceImages` arg on `submitVideoJob`.
- **`src/lib/director/api.ts`**: extend `submitVideoJob(prompt, provider, sessionId?, options?, referenceImages?)` and forward `reference_image_urls` in the function body.
- **`supabase/functions/generate-video/index.ts`**:
  - Accept `reference_image_urls?: string[]` on the submit action.
  - Add a `seedance-2.0-ref` provider mapping to fal's reference-to-video endpoint (`fal-ai/bytedance/seedance-2.0/reference-to-video`). If that endpoint id differs in fal's catalog, fall back to `fal-ai/bytedance/seedance/v1/pro/reference-to-video`.
  - In `buildFalPayload`, when the provider ends with `-ref`, add `reference_image_urls` to the payload alongside the existing seedance options.
  - In `doGenerate`, pick `seedance-2.0-ref` when `referenceImages.length > 0`, else keep `seedance-2.0`.
- Persist the references on the job row so retries/polls keep them (add `reference_image_urls jsonb` column via a migration; nullable, default null).

## 3. Out of scope

- No changes to the right-side Product/Avatar/Generate tile styling.
- No changes to the prompt composer copy in `marketingStudio.ts` (the textual `Brand:` / `Character:` lines stay — they help the model even when refs are attached).
- No model picker exposed to the user; the `-ref` switch is automatic.

## Technical notes

```text
[ chips row ]  📦 Haribo can…  ✕    🧑 Stefan  ✕    📍 Tokyo  ✕
[ textarea  ]  Describe what happens in the ad…
[ chips     ]  Format ▾  Hook ▾  Setting ▾  ⚙  …  [Product tile][Avatar tile][Generate]
```

Migration:

```sql
alter table public.video_jobs
  add column if not exists reference_image_urls jsonb;
```
