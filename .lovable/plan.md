
## Goal — Seedance 2.0 / 2.0 Fast: "@Element" reference workflow (Higgsfield-style)

For these 2 models, replace the standard 1-image flow with a **multi-reference grid** (up to 10 mixed media — images, videos, audio) and add an **`@Elements` mention picker** inside the prompt textarea. The AI Director auto-tags each reference (`Element 1`, `Element 2`, …) and either uses the user's `@Element N` mentions or injects them automatically into the final `mainPrompt` so the user can copy-paste a fully-referenced prompt straight into Seedance.

## Reference (uploaded screenshot)
- 3×N grid of small thumbnails (image / video first frame / audio waveform), `+` tile to add more, max 10.
- Prompt textarea with `@ Elements` chip below it → opens a dropdown listing every uploaded reference numbered `Image 1, Image 2 …` (we'll use **Element 1, Element 2, …** so it covers video/audio too).
- Selecting one inserts a styled `@Element 3` token into the prompt at the cursor.

## Approach

### 1. Model contract — new flow flag
`src/lib/modelContracts.ts`:
- Add `supportsElementReferences?: boolean` and `maxElements?: number` (default 10).
- For `seedance-2.0` and `seedance-2.0-fast`: enable this flag, drop the standard single image slot in favor of the grid.

### 2. New component: `ElementGrid` (replaces ImageUploadZone for these 2 models)
`src/components/ElementGrid.tsx`:
- 3-column grid, up to 10 tiles, accepts image/video/audio (reuses `detectKind` + `compressImageFile` + `extractVideoKeyframes` + `URL.createObjectURL`).
- Each tile shows: thumbnail, small **`#1` … `#10`** badge (auto-numbered by upload order), kind icon (image/film/music), remove ✕ on hover.
- `+` tile at the end (disabled at 10).
- Numbering is **stable** per session — removing a middle item shifts numbers down (and the prompt mentions update accordingly, see §4).

### 3. New component: `MentionTextarea`
`src/components/MentionTextarea.tsx`:
- Wraps the existing `Textarea`.
- Below the textarea, two chips matching the screenshot: **`@ Elements`** (opens dropdown) and **`🔊 On/Off`** (already exists for audio toggle — we just relocate it here for these models).
- Typing `@` also opens the dropdown inline.
- Dropdown lists `Element 1 … Element N` with the same thumbnail. Click → inserts `@Element N` token at cursor.
- Tokens are stored as plain text (`@Element 3`) inside the textarea value — simplest, survives copy/paste, no contentEditable complexity. We render them visually with a lightweight overlay-highlight (regex-matched span behind the textarea using a mirrored div) so they appear as cyan chips.

### 4. WorkflowPanel wiring
`src/components/WorkflowPanel.tsx`:
- When `contract.supportsElementReferences` is true:
  - Hide normal `ImageUploadZone` slots and `ReferenceMediaPanel`.
  - Render `<ElementGrid>` + `<MentionTextarea>` instead of `<ConfigPanel>`'s textarea (ConfigPanel presets still available below in collapsible).
- Build the request payload:
  - Send `elements: [{ index: 1, kind, role: "auto", filename, images?, note? }, …]` (reuses existing `references` schema, shape-compatible — server already validates it).
  - Send `description` containing the `@Element N` tokens as-is.
  - Send a new flag `autoInjectElements: true` so the backend knows to substitute / inject mentions.

### 5. Backend — auto-inject element mentions into mainPrompt
`supabase/functions/generate-prompt/index.ts`:
- Treat incoming `elements` exactly like `references` for the vision payload (already supported), but pass them through with explicit numeric labels: `"Element 1 (image, filename: shoe.jpg)"`, `"Element 2 (video keyframes, filename: dance.mp4)"`, …
- Add a new system addendum block when `autoInjectElements === true`:
  > "The user uploaded N numbered Elements. They may reference them in the brief as `@Element 3` etc. In your `mainPrompt`:
  > 1. Preserve every `@Element N` mention from the user's brief verbatim (Seedance parses these as reference anchors).
  > 2. If the user did **not** mention an Element, you must still incorporate it naturally and tag it inline as `(@Element N: <one-word role: subject/outfit/style/lighting/motion>)` the first time it appears.
  > 3. Never describe an Element's content literally without its `@Element N` tag — Seedance needs the anchor to bind generation to the upload."
- Update `experts/seedance.ts`: add a Seedance-2.0 example showing `mainPrompt` containing `"...wearing the outfit from @Element 6 (outfit), in the lighting style of @Element 2 (lighting)..."`.

### 6. ResultsPanel — element legend
`src/components/ResultsPanel.tsx`:
- When the result was generated from an Element flow, show a small **"Elements used"** strip above the main prompt: numbered thumbnails 1-N. Helps the user verify which uploads the prompt is bound to before copying.
- The "Copy into Seedance 2.0" button copies the prompt **with** `@Element N` tokens intact.

### 7. i18n
Add to `en.ts` + `ar.ts`:
`elements.title` ("Elements"), `elements.add` ("Add reference"), `elements.limit` ("Up to 10"), `elements.mentionHint` ("Type @ to mention an Element"), `elements.legend` ("Elements used in this prompt"), `elements.autoTag` ("AI auto-tagged unmentioned elements").

### 8. Files touched
- **New**: `src/components/ElementGrid.tsx`, `src/components/MentionTextarea.tsx`
- **Edit**: `src/lib/modelContracts.ts`, `src/components/WorkflowPanel.tsx`, `src/components/ResultsPanel.tsx`, `supabase/functions/generate-prompt/index.ts`, `supabase/functions/generate-prompt/experts/seedance.ts`, `src/i18n/translations/en.ts`, `src/i18n/translations/ar.ts`

### 9. Out of scope (confirm if you want)
- Drag-to-reorder elements (numbering = upload order for v1).
- Persisting element thumbnails to history (we already upload main images — element files would need new storage logic).
- Audio transcription (still mood-note only, like existing references).

No DB changes. No new dependencies.
