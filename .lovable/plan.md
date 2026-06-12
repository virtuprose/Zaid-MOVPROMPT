## Problem

When you generate a prompt in MovPrompt and click "Open in AI Director" to render, Seedance generates a video of a different baby — your reference image is ignored.

Root cause traced in the code + database:

- `WorkflowPanel.tsx` writes the handoff with `attachments: [{ kind: "image", url: img.preview, … }]`. `img.preview` is a local **`blob:`** URL created by the browser — it only exists in that tab.
- `DirectorChat.tsx` rebuilds `referenceImageUrls` from chat attachments but filters URLs through `isProviderReadyImageUrl`, which only accepts `https://` or `data:image/…`. Every `blob:` URL is dropped.
- Result: `submitVideoJob` is called with **zero** reference images, so `generate-video` stores `reference_image_urls = NULL` and the Seedance 2.0 reference-to-video endpoint never receives `image_urls`. The DB confirms this — the latest `seedance-2.0-ref` job row has empty `reference_image_urls` and the prompt even contains the giveaway phrase "Inspired by ." with nothing after it.

## Fix

Upload the MovPrompt reference images to the `director-uploads` bucket during the handoff, so the Director receives real signed `https://` URLs that survive the filter and get forwarded to Seedance.

### `src/components/WorkflowPanel.tsx` — "Open in AI Director" button

1. Make the click handler async. Disable the button and show a small "Sending references…" state while it runs.
2. For each `img` in `images.filter(Boolean)`:
   - If `img.file` exists, call `ingestImage(img.file)` from `@/lib/director/ingest` — this already handles auth, optional downscale, upload to `director-uploads`, and returns `{ kind: "image", name, url, storage_path }` with a real signed URL.
   - If `img.file` is missing (e.g. a pre-existing preview without a File), fall back to fetching `img.preview` as a Blob and calling `uploadAndSign(blob, uid, name, "image/jpeg")`, then construct the same `Attachment` shape.
3. Pass that array as `attachments` to `writeHandoff`. Never pass `blob:` URLs.
4. If the user is not signed in, show a toast asking them to sign in and abort the handoff (Director needs auth to use the references anyway).
5. If any single upload fails, surface a clear error toast and abort — partial reference sets silently produce the wrong baby, which is exactly the bug we're fixing.

### Why not "fix it in the Director"

Doing the upload on the Director side would mean re-introducing the same browser session's `blob:` URL through `sessionStorage`. `blob:` URLs from one page are sometimes inaccessible after navigation; even when they work, we'd be duplicating logic that already exists in `ingest.ts`. Uploading at the source is one straightforward call.

### No backend changes needed

- `generate-video` already routes `seedance-2.0-ref` correctly and passes `image_urls` to fal when references exist (verified at `supabase/functions/generate-video/index.ts:292`).
- `DirectorChat`'s `referenceImageUrls` memo already picks up image attachments from both pending attachments and prior bubbles, so once the URLs are real `https://` they will flow through to `submitVideoJob` and into the job row.

## Verification

After the fix, repeat the same flow (generate in MovPrompt → Open in AI Director → render with Seedance 2.0). Check a fresh row in `video_jobs`:
- `reference_image_urls` should be a non-empty array of `https://…supabase.co/storage/v1/object/sign/director-uploads/…` URLs.
- The rendered video should preserve the baby from the reference image.
