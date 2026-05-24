## Why images look low-res today

`generate-reference-image` calls Gemini `gemini-3.1-flash-image-preview` and stores the raw model output. That model returns ~1024px on the long edge — that's the "1K" feel the user is seeing. There's no resolution param on the model, so to deliver 2K / 4K we need an **upscaling step** after generation. FAL is already wired (`FAL_KEY` secret present), and FAL exposes fast image upscalers (e.g. `fal-ai/clarity-upscaler` or `fal-ai/esrgan`), which is the cleanest path.

## Goal

Let the user pick output quality per generation:

| Quality | Long edge | Pipeline | Cost |
|---|---|---|---|
| **1K** | ~1024px | Gemini only (current) | Free (existing image_generation price) |
| **2K** | ~2048px | Gemini → FAL 2× upscale | Free (no extra credits) |
| **4K** | ~4096px | Gemini → FAL 4× upscale | Extra credits per image |

1K stays the default so nothing changes for users who don't care.

## UX

1. New **Quality picker** rendered next to the existing aspect-ratio chooser in `DirectorChat.tsx` (the `aspect_choice` bubble flow at lines ~812–828, and the auto-aspect path that already passes `aspect_ratio`). Three pills: `1K · 2K · 4K (N cr)`.
2. Quality is remembered on the bubble payload (`payload.quality`) and threaded through `runImageGeneration` → `api.generateReferenceImage{,Stream}` → edge function, alongside `aspect_ratio`.
3. The "4K" pill shows the credit cost inline (pulled from a `priceFor("image_upscale_4k")` value surfaced via existing settings endpoint, or hardcoded constant mirrored client+server).
4. In `GeneratedImageCard`, show a small "1K / 2K / 4K" badge so the user can tell what they got.
5. PromptInspector / download stays unchanged — the stored asset is already the upscaled file.

## Backend changes (`supabase/functions/generate-reference-image/index.ts`)

1. Accept `quality?: "1K" | "2K" | "4K"` in the request body (default `"1K"`).
2. After Gemini returns each panel's base64:
   - `1K` → keep as-is (current behavior).
   - `2K` / `4K` → POST to FAL upscaler with `scale: 2` or `4`, await the upscaled URL, fetch bytes, then continue with the existing upload-to-`generation-images` storage flow.
3. Credits:
   - Add `priceFor("image_upscale_4k", 3)` (tunable). 2K stays free.
   - When `quality === "4K"`, charge `prompts.length * upscalePrice` **in addition** to the existing `image_generation` charge, in the same pre-charge step. Refund on failure (same `refundCredits` pattern already used).
4. Store `quality` on the response object per image so the UI can render the badge: extend `GeneratedImage` with `quality?: "1K" | "2K" | "4K"`.
5. Failure isolation: if the upscale step fails for a single panel, fall back to the 1K asset for that panel and emit a `panel_error`-style warning rather than failing the whole batch. Refund the 4K surcharge for any panel that fell back.

## Frontend touch list

- `src/lib/director/api.ts` — add `quality` to `generateReferenceImage` input + `GeneratedImage` type.
- `src/components/director/DirectorChat.tsx` — quality state on `aspect_choice` bubble, thread `quality` into all `runImageGeneration` / `generateReferenceImage*` call sites (lines 664, 703, 822, 1043, 1397, 1443).
- New tiny component `QualityPicker.tsx` (or inline alongside the aspect chips) that renders the 3 pills + the live credit cost for 4K.
- `src/components/director/GeneratedImageCard.tsx` — quality badge.

## Out of scope

- Re-upscaling already-generated images from the library (can be a follow-up "Upgrade to 4K" action on the inspector).
- Video resolution — already controlled separately.
- Changing the base Gemini model.

## Open question for the user

Default credit cost for 4K — propose **3 credits per panel** (so a 6-panel storyboard 4K = 18 cr). OK, or different number?