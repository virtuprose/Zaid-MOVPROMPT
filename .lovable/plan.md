## Goal

Make the AI Director route to `bytedance/seedance-2.0/reference-to-video` whenever the user has attached references in the chat, send every image in `image_urls`, and tag each subject as `@Image1` / `@Image2` / `@Image3` in the prompt so identity locks across the shot. Today the Director never forwards the chat attachments to `submitVideoJob`, so even when the user picks Seedance the renderer falls back to text‑to‑video and identity drifts.

## Changes

### 1. `src/lib/director/api.ts` — keep `submitVideoJob` signature, just used by both flows

Already accepts `referenceImages?: string[]` and forwards them as `reference_image_urls`. No edit needed — it just needs callers to actually pass the array.

### 2. `src/components/director/PromptResultCard.tsx`

- Accept a new prop `referenceImageUrls?: string[]` (ordered: brand, character, location — same order the Director used when scanning attachments).
- In `generateVideo(...)`:
  - If `referenceImageUrls.length >= 2` → force `model.id = "seedance-2.0-ref"`.
  - Else if `referenceImageUrls.length === 1` → force `"seedance-2.0"`.
  - Else keep the user's pick (text‑only models).
  - Prepend `@Image1 …, @Image2 …, @Image3 …` lines to `finalPrompt` (one per ref slot) so Seedance binds each subject. Use a small `buildRefTags(urls, slots)` helper that mirrors `refTag()` in `src/lib/marketingStudio.ts`.
- Pass `referenceImageUrls` as the 5th arg to `submitVideoJob`.
- Pass the same array to `<VideoOptionsDialog>` so the dialog can hide unsupported options when a ref-to-video model is forced.

### 3. `src/components/director/DirectorChat.tsx`

- Compute a memoised `referenceImageUrls` from the aggregated `mergedAttachments` logic that already exists (lines 275–294), filtering `kind === "image"` and taking `a.url` (max 9, in chronological turn order — current turn first like today).
- Tag each URL with a slot guess: first image → `"brand"`, second → `"character"`, third+ → `"location"`. Store as a parallel `referenceImageSlots: Array<"brand"|"character"|"location">` array.
- Pass both arrays into `<PromptResultCard referenceImageUrls={...} referenceImageSlots={...} />` (the two locations at lines 827 and 882 area).
- In the `request_video_generation` branch (line 381) replace the bare `"seedance"` provider with the same routing rule (0 → `seedance-v1-pro`, 1 → `seedance-2.0`, 2+ → `seedance-2.0-ref`) and pass `referenceImageUrls` to `submitVideoJob`. Also prepend the `@ImageN` tags to `resolvedPrompt` before sending.

### 4. `src/lib/director/videoModels.ts`

- Add the missing single-image `seedance-2.0` entry (id `seedance-2.0`, label "Seedance 2.0", `requiresReference: true`) right above `seedance-2.0-ref`, so the model picker can surface it when the user has exactly one ref.

### 5. No backend changes

`supabase/functions/generate-video/index.ts` already maps `seedance-2.0` and `seedance-2.0-ref` to the correct bare FAL paths and already sends `image_url` / `image_urls`. Nothing to redeploy.

### 6. Verify

- With 0 refs: Director picks `seedance-v1-pro`, no `@ImageN` tags, request body has no `image_urls`.
- With 1 image attached: request goes to `bytedance/seedance-2.0/image-to-video`, `image_url` set, prompt starts with `@Image1 …`.
- With 3 images attached: request goes to `bytedance/seedance-2.0/reference-to-video`, `image_urls` array has all 3 URLs in turn order, prompt starts with `@Image1`, `@Image2`, `@Image3` lines.
- Check Director edge function logs to confirm the payload.

## Out of scope

- Letting the user manually re-order ref slots (always brand/character/location by attachment order for now).
- Changing how the Director chat collects attachments.
- DB schema, auth, UI restyle.