## Inline upload affordance when the Director asks for files

When the Director's question contains a "send me images/video/audio/files" intent, surface an inline upload control directly under that question so the user doesn't have to scroll to the composer.

### Detection
- Add a small helper `detectMediaAsk(text)` in `src/lib/director/questionIntent.ts` that returns `null` or `{ kinds: ("image"|"video"|"audio"|"document")[] }`.
- Regex-based, case-insensitive, English + Arabic keywords (project supports AR). Examples that should match:
  - "drop / share / send / upload / attach / paste"
  - "image, photo, picture, screenshot, frame, reference"
  - "video, clip, footage, reel"
  - "audio, voice, sound, music, track"
  - "file, document, pdf, doc"
  - AR: "صور", "صورة", "فيديو", "ملف", "ارفع", "أرسل"
- Pure function, unit-testable, no React deps.

### UI: per-question upload slot in `QuestionCard.tsx`
- For each question, run `detectMediaAsk(q)`. If it matches, render an inline upload row directly below the question text (before/instead of the text input).
- The row shows:
  - A primary "Upload {label}" button (label adapts: "image", "video", "audio", "file" — plural when multiple kinds).
  - A small "or drop here" dashed hint area that accepts drag-and-drop.
  - Thumbnails of files added via this slot, with an X to remove.
  - File input is scoped with an `accept` attribute matching the detected kinds (`image/*`, `video/*`, `audio/*`, `.pdf,.docx,.txt,.md`).
- Files uploaded through this slot go into the existing chat-level `attachments` state via a new `onAttach(files)` callback on `QuestionCard`. They appear as @-mention attachments just like composer uploads — same ingestion pipeline (`classifyFile` + `ingestImage/Video/Audio/Document`), same moderation, same 12-file cap.
- The text input below the upload slot stays optional so the user can still add a note ("here are the frames, focus on lighting").

### Wiring in `DirectorChat.tsx`
- Pass two new props to `QuestionCard`:
  - `attachments` (current chat attachments) — to show what's already attached for that question.
  - `onAttach(next: Attachment[])` — same setter used by Composer.
- Submit behavior change for media questions: when the user clicks Continue, the formatted answer includes a marker like `1. [attached 3 images]` (or the user's typed note + attachment count) so the agent sees the references were provided. Existing attachments flow through `send()` unchanged.

### Reuse, don't duplicate
- Lift the ingestion logic out of `Composer.tsx` into a shared hook `useAttachmentIngest()` in `src/lib/director/useAttachmentIngest.ts` (returns `{ ingest(files), busy }`) so both `Composer`, `AttachmentDropzone`, and the new `QuestionCard` upload slot share one implementation. Composer keeps its existing UX; only the internals change.
- Keep the existing `AttachmentDropzone` untouched (it's used elsewhere).

### Visual style
- Match the muted card aesthetic of `QuestionCard` (`bg-muted/15`, rounded, dashed border on drop area).
- Use cinematic accents: cyan focus ring on the button, amber pulse while ingesting, scanning-style ring on each thumbnail until moderation passes (reuse the moderation chip pattern from Composer).
- Respect `prefers-reduced-motion`.

### Out of scope
- No backend / edge function changes.
- No changes to the agent's question generation prompt — pure client-side detection.
- No new attachment storage; reuses the existing per-session attachments list.
- No camera capture (could be a follow-up).

### Files touched
- New: `src/lib/director/questionIntent.ts` (+ small Vitest in `src/lib/director/__tests__/questionIntent.test.ts`)
- New: `src/lib/director/useAttachmentIngest.ts`
- New: `src/components/director/QuestionUploadSlot.tsx`
- Edit: `src/components/director/QuestionCard.tsx` — render `QuestionUploadSlot` when intent matches; accept `attachments` + `onAttach` props.
- Edit: `src/components/director/DirectorChat.tsx` — pass `attachments` + `setAttachments` down to `QuestionCard`.
- Edit: `src/components/director/Composer.tsx` — swap internal ingest for the shared hook (no UX change).

### Acceptance check
1. Agent asks "Drop a few reference images of the look you want" → upload button + dashed drop area appears under that question, accepting only images.
2. Agent asks "Share a short video clip or any audio mood" → button labeled "Upload video or audio", `accept` includes both.
3. Files uploaded through the slot show as @1, @2 in the eventual user message and are sent with the next turn.
4. Non-media questions render exactly as today (no regression).
