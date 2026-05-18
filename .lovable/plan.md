
# Character Sheet + 3×3 Storyboard → Videos

Today the Director sees a 3×3 storyboard grid as one image and a character sheet as another. That collapses 9 distinct shots into a single blurry reference and loses the per-pose identity from the character sheet. This plan adds first-class handling so a user can drop both, and walk away with 9 on-model clips.

## The flow we're building

```text
User drops:                       Director:                         Output:
┌───────────┐ ┌─────────┐         ┌──────────────────┐              ┌──────────┐ ┌──────────┐
│ character │ │ 3×3     │   ───►  │ split grid →     │   ───►       │ shot 1   │ │ shot 2   │ ...
│ sheet     │ │ board   │         │ 9 panels +       │              │ .mp4     │ │ .mp4     │
└───────────┘ └─────────┘         │ identity ref     │              └──────────┘ └──────────┘
                                  │ lock 1 model     │              (9 clips, same model,
                                  │ + 1 spec         │               same style, same character)
                                  └──────────────────┘
```

## Changes

### 1. New attachment role: `tag` (client-side)

Extend `Attachment` in `src/lib/director/ingest.ts`:

- Add optional `role?: "character" | "storyboard" | "reference"` and `shot_index?: number` (1–9).
- No backend change required — it flows through the existing `attachments` payload.

### 2. Grid auto-split — `src/lib/director/gridSplit.ts` (new)

- Canvas-based utility: detect a near-square image with ≥ 3 clean horizontal+vertical gutters → assume N×M grid.
- Default to 3×3 when the user explicitly says "storyboard". When unsure, ask once (chip: `3×3` / `2×2` / `2×3` / `Not a grid`).
- Crop each cell to its own blob, upload via the existing `uploadAndSign`, return 9 Attachments tagged `role: "storyboard"` and `shot_index: 1..9`.
- All 9 keep the same `parent_storage_path` so the UI can collapse them under "Storyboard panel".

### 3. Composer affordance — `src/components/director/Composer.tsx` + `AttachmentDropzone.tsx`

- When an image is dropped, run a quick heuristic: aspect ≈ 1:1 and detectable grid lines → show a chip "Treat as storyboard (3×3)" inline above the send button.
- Add a small `Role` selector on each attachment chip: `Character` / `Storyboard` / `Reference` so users can override.
- Character role pins that attachment as identity ref for the whole session (stored in `localState`).

### 4. Director system prompt — `supabase/functions/director-agent/index.ts`

Add a `STORYBOARD INGEST` section:

- If the user uploads attachments tagged `role: "storyboard"` (referenced as `@shot-1` … `@shot-N` in the brief) AND optionally one or more tagged `role: "character"` (referenced as `@character` / `@character-2`):
  - Step 1: `ask_model_choice` exactly once with locked_spec, pinning a multi-reference engine: `kling-omni` (default) or `seedance-2.0-ref` (cinematic).
  - Step 2: for each shot panel, call `generate_prompt` once. Each call MUST:
    - Reuse the locked spec verbatim (style, aspect, resolution, audio, model).
    - Include the character ref + that shot's panel as the two attachments.
    - Echo the character description verbatim in `breakdown.subject` so identity stays stable.
  - The continuity rules added earlier already enforce style + spec carry-over; this section adds character + model carry-over.
- New per-batch helper response: `ask_storyboard_plan` tool that returns `{ shot_count, per_shot_summaries[] }` so the UI can show a checklist before firing 9 prompt generations.

### 5. New tool: `generate_storyboard_prompts` (server)

Wraps the per-shot loop in one round-trip so the user gets 9 prompts back at once:

- Input: `locked_spec`, `model_id`, `character_ref_urls[]`, `shot_panels: [{ url, index, brief_hint? }]`.
- Server runs N sequential `generate_prompt` calls (single Gemini session, history pre-loaded with the character description + previous shots' prompts so the model keeps continuity).
- Output: `{ shots: [{ index, prompt, breakdown, locked_spec }] }`.

### 6. UI — Storyboard result card — `src/components/director/StoryboardResultCard.tsx` (new)

- Renders the 9 prompts as a 3×3 grid mirroring the source. Each cell has: thumbnail of the panel, the generated prompt (truncated), a `Render` button.
- Top-right: `Render all 9` button → fires 9 `generate-video` jobs against the locked model with the locked options, named `Shot 1 of 9 …`.
- Reuses the existing `VideoOptionsDialog` once to confirm options for the whole batch.

### 7. Library grouping — `src/pages/Library.tsx`

- Group videos that share a `storyboard_session_id` under one collapsible card titled by the session title, with the 3×3 thumbnail.
- New column in the `videos` table: `storyboard_session_id uuid` and `storyboard_shot_index int`. Migration in scope.

## Out of scope

- Auto-stitching the 9 clips into one timeline. (Add later as an Edit step.)
- OCR on hand-drawn panels for caption extraction. (Director already reads scribbles via vision.)
- Animatic preview. (V2.)

## Acceptance

- User drops `character_sheet.jpg` + `board_3x3.png`. Composer auto-detects the grid, asks once to confirm "3×3 storyboard?", user taps yes.
- Director asks model + spec once. User picks kling-omni · 9:16 · 1080p · cinematic-film · 5s.
- One round-trip returns 9 prompts. Storyboard card renders. User taps "Render all 9".
- All 9 clips arrive in Library, grouped under one collapsible "Storyboard — <title>" entry, same character recognizable across every clip.

## Files touched

- `src/lib/director/ingest.ts` (extend Attachment)
- `src/lib/director/gridSplit.ts` (new)
- `src/lib/director/localState.ts` (persist character ref)
- `src/components/director/Composer.tsx`
- `src/components/director/AttachmentDropzone.tsx`
- `src/components/director/DirectorChat.tsx` (wire new tool + card)
- `src/components/director/StoryboardResultCard.tsx` (new)
- `supabase/functions/director-agent/index.ts` (system prompt + new tool)
- `supabase/functions/generate-video/index.ts` (accept `storyboard_session_id`, `storyboard_shot_index`)
- DB migration: add `storyboard_session_id`, `storyboard_shot_index` to `videos`
- `src/pages/Library.tsx` (grouping)
