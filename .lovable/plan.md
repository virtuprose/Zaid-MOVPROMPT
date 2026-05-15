# Image-time moderation via Lovable AI

## Why

The current eligibility flow runs at "Generate Video" click and checks the prompt against a fal.ai endpoint that does not exist (returns 404, fail-open). You want the check to happen **the moment an image is uploaded**, on the image itself, so flagged content is caught before the user invests time writing prompts or picking models.

## How

**New edge function: `moderate-image`** (`supabase/functions/moderate-image/index.ts`)

- Input: `{ image_url: string }` (signed URL from `director-uploads`, or video keyframe).
- Calls Lovable AI Gateway, model `google/gemini-2.5-flash` (cheap, fast, multimodal).
- Uses `Output.object()` with this Zod schema:
  ```ts
  {
    eligible: boolean,
    severity: "safe" | "borderline" | "blocked",
    categories: string[],   // e.g. ["nudity","violence","minors","weapons","hate","copyright"]
    reason: string          // ≤200 chars, explains why if not eligible
  }
  ```
- System prompt: strict commercial-video safety classifier modeled on Seedance / Veo policies (no nudity, no minors in suggestive contexts, no graphic violence, no real-person likeness, no hate symbols, no extremist content, no copyrighted characters/logos).
- Returns 200 with the structured result. CORS via `npm:@supabase/supabase-js@2/cors`. JWT-validated.

**Attachment type extension** (`src/lib/director/ingest.ts`)

Add an optional `moderation` field to image and video_keyframes attachments:
```ts
moderation?: { state: "scanning" | "ok" | "blocked"; reason?: string; categories?: string[] }
```

**Wire-in: `AttachmentDropzone.tsx`**

After `ingestImage` / `ingestVideo` returns, push the attachment with `moderation.state = "scanning"`, then `await` `moderate-image` for each image/keyframe URL in parallel. On result, patch the attachment in state.

- **Blocked** → red shield icon on the chip, hover/tap shows the reason and categories. Toast: *"Image blocked: {reason}"*.
- **OK** → small green check, no fuss.
- **Failure / 5xx** → silent fail-open with a small "Couldn't verify" tooltip; user can still proceed.

**Send-time guard: `Composer.tsx` (or whichever component triggers director-agent)**

Disable the Send button while any attachment is `scanning` (with tooltip *"Scanning attachments…"*), and block sending with a toast if any attachment is `blocked` (*"Remove the flagged images to continue"*).

**Prompt-time check removal**

- `VideoOptionsDialog`: remove the `requiresEligibilityCheck` branch, the `checkVideoEligibility` call, the rewriting state machine, and the blocked banner. The dialog goes back to `idle → submit`.
- `videoModelControls.ts`: remove `requiresEligibilityCheck` and the `ELIGIBILITY_CHECK_MODELS` set.
- `generate-video/index.ts`: remove the `check_eligibility` action, the `ELIGIBILITY_ENDPOINTS` map, the server-side enforcement block in `submit`, and the related helpers.
- `director-agent/index.ts`: keep `rewrite_safe` for now (still useful as an explicit user action; not auto-invoked).
- `api.ts`: remove `checkVideoEligibility`; keep `rewritePromptSafe` (no caller, but lightweight) or remove — out of scope unless you say otherwise.

## Out of scope

- Document and audio moderation (text references rarely violate image-safety policies; can be added later).
- Re-running moderation when a signed URL expires.
- Persisting moderation results to a DB table.
- Auto-rewrite of the prompt — image moderation can't be solved by rephrasing.

## Open question

When an image is flagged, should the app:
- **(default in this plan)** Keep the chip visible with a red marker and block Send until the user removes it, or
- Auto-remove the attachment and just toast the reason?

I'll go with the first (visible + blocking) unless you say otherwise.

## Files

- `supabase/functions/moderate-image/index.ts` — new
- `src/lib/director/ingest.ts` — add `moderation` field
- `src/lib/director/api.ts` — add `moderateImage()` helper, remove `checkVideoEligibility`
- `src/components/director/AttachmentDropzone.tsx` — kick off moderation, render badges
- `src/components/director/Composer.tsx` — gate Send on moderation state
- `src/components/director/VideoOptionsDialog.tsx` — remove eligibility flow
- `src/lib/director/videoModelControls.ts` — drop `requiresEligibilityCheck`
- `supabase/functions/generate-video/index.ts` — drop eligibility action + enforcement
