

## Issue
The "File is over 10MB" toast comes from the **Reference Media** / **Element Grid** uploaders (not the main image upload). The current cap is `MAX_FILE_SIZE = 10 * 1024 * 1024` in two files. The user's "Professional Chat Image from Freepik.png" exceeded that cap.

## Root cause
- `src/components/ReferenceMediaPanel.tsx` line 10 — `const MAX_FILE_SIZE = 10 * 1024 * 1024`
- `src/components/ElementGrid.tsx` line 28 — `const MAX_BYTES = 10 * 1024 * 1024`
- Translations: `en.ts` ("File is over 10MB", "Max 10MB per file") + matching `ar.ts` strings.

Note: the main `ImageUploadZone` (hero/single/two-frame images) has **no size cap** — those go through `compressImage()` in `WorkflowPanel`, which downscales to 1280px JPEG before sending to the edge function. Reference & element uploads need the same treatment OR a higher cap.

## Plan — raise to 25 MB and clarify copy

Best balance of user freedom + edge-function payload safety (Supabase function payloads cap around 6 MB after base64 — but reference images are also compressed via `compressImageFile` to ~1024px before send, so a 25 MB source PNG ends up well under that). Videos still get keyframes extracted client-side, so source size only impacts browser memory.

### Changes

**1. `src/components/ReferenceMediaPanel.tsx`**
- Bump `MAX_FILE_SIZE` from `10 * 1024 * 1024` → `25 * 1024 * 1024`.

**2. `src/components/ElementGrid.tsx`**
- Bump `MAX_BYTES` from `10 * 1024 * 1024` → `25 * 1024 * 1024`.

**3. `src/i18n/translations/en.ts`**
- `references.tooLarge`: `"File is over 10MB"` → `"File is over 25MB"`
- `references.videoHint`: `"...Max 10MB per file."` → `"...Max 25MB per file."`

**4. `src/i18n/translations/ar.ts`**
- Same two strings updated to "25MB".

### Files touched
- `src/components/ReferenceMediaPanel.tsx`
- `src/components/ElementGrid.tsx`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`

No backend, no schema, no edge-function changes. Frontend-only — requires **Publish → Update** to reach live users.

