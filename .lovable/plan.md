
## Goal
Let users attach **reference media** (images, videos, audio) alongside the main image upload, so the AI Director can pull style, motion, lighting, and mood cues from them when generating prompts.

## Current state
- `WorkflowPanel` accepts 1–2 main images via `ImageUploadZone`, base64 → sent as `images[]` to `generate-prompt`.
- AI vision (Gemini 2.5 Pro) ingests **images natively**. It cannot directly process video or audio in this pipeline — we handle those by extracting frames (video) and using a user-typed mood note (audio).

## Approach

### 1. New "Reference media" panel in `WorkflowPanel`
Collapsible section under the main image slots: **"Reference media (optional) — up to 5"**.

Each reference is a card with:
- Thumbnail (image preview / video poster / audio waveform icon)
- **Role dropdown**: `Style`, `Lighting`, `Composition`, `Motion`, `Mood / Audio`
- Optional one-line note (e.g. "match this color grade")
- Remove button

### 2. How each media type is handled
| Type | Client processing | Sent to AI |
|---|---|---|
| **Image** | Resize to ≤1024px, base64 | Image input + role label |
| **Video** | Extract 3 keyframes (start/middle/end) via `<video>` + canvas | 3 images tagged "motion reference" + filename |
| **Audio** | No transcription — show waveform icon only | Filename + user's mood note as text context |

Limits: 5 files total, 10MB per file, video ≤30s recommended.

### 3. Backend (`generate-prompt/index.ts`)
- Accept new optional field: `references: { kind: 'image'|'video'|'audio', role: string, images?: string[], note?: string, filename?: string }[]`
- Validate: max 5 entries, total payload guard (~8MB combined).
- Build a "Reference Brief" text block injected before the main user text:
  ```
  REFERENCE MEDIA (use as guidance, do NOT copy literally):
  - Ref #1 (Lighting, image): use ONLY for lighting/color cues
  - Ref #2 (Motion, video keyframes): use ONLY for camera/subject motion pacing
  - Ref #3 (Mood, audio "punchy 120bpm drums"): inform audioBlock energy
  ```
- Append reference images to the vision payload after main images, each preceded by its label.
- Add a short **"Reference Handling Protocol"** to `_base.ts` so all expert agents respect roles (don't copy subjects from refs, only the tagged attribute).

### 4. New components
- `src/components/ReferenceMediaPanel.tsx` — collapsible container + add button + 5-item limit
- `src/components/ReferenceItem.tsx` — single card (thumbnail, role select, note input, remove)
- `src/lib/videoFrames.ts` — helper: extract N keyframes from a video File → base64 images

### 5. i18n
Add to `en.ts` + `ar.ts` under `references.*`:
`title`, `add`, `limit`, `roleLabel`, `roles.style|lighting|composition|motion|mood`, `notePlaceholder`, `videoHint`, `audioHint`, `remove`.

### 6. Files touched
- **New**: `ReferenceMediaPanel.tsx`, `ReferenceItem.tsx`, `videoFrames.ts`
- **Edit**: `WorkflowPanel.tsx` (mount panel, pass refs to API call), `generate-prompt/index.ts` (validate + inject refs), `experts/_base.ts` (protocol), `en.ts`, `ar.ts`

### Open questions before I build
1. **Audio handling** — confirm we just take a user mood note (no transcription)? Or do you want me to wire ElevenLabs Scribe to transcribe spoken audio refs into text cues?
2. **Video** — keyframe extraction (3 stills) is fast and free. OK, or do you want full motion analysis later (heavier)?
3. **Limit** — 5 total references feels right; say the word if you want 3 or 10.

If you approve as-is I'll go with: **5 max**, **audio = mood note only (no transcription)**, **video = 3 keyframes**.
