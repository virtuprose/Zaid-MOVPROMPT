# Director-driven image generation

Add lightweight, in-chat image generation so the Director can fill the two gaps that currently dead-end the 3×3 storyboard flow: missing character sheet, missing storyboard panels. No standalone image playground, no new page, no Composer button.

## Why

Today the Director can only reason over images the user uploads. Two real dead-ends:

- User has a 3×3 storyboard but no character → identity drifts across 9 shots.
- User has a character but no storyboard → no panels to drive shot-by-shot prompts.

A focused image tool closes both loops inside the existing chat, feeding generated images straight back into the attachment pipeline we just built (`role: "character" | "storyboard"`).

## Flow

```text
User: "design a character for this storyboard"        User: "I only have a character, make me a 3×3 board"
        │                                                     │
        ▼                                                     ▼
  Director calls generate_reference_image                Director calls generate_reference_image
  mode: "character_sheet"                                mode: "storyboard_panels", count: 9
        │                                                     │
        ▼                                                     ▼
  1 image returned, attached to turn                     9 images returned as a 3×3 grid
  role: "character" (locked as identity ref)             role: "storyboard", shot_index: 1..9
        │                                                     │
        └──────────────► continues existing flow ◄────────────┘
                         (locked spec → 9 video prompts → render all)
```

## Changes

### 1. New edge function — `supabase/functions/generate-reference-image/index.ts`

- Calls `google/gemini-3.1-flash-image-preview` via Lovable AI Gateway (`LOVABLE_API_KEY`).
- Inputs:
  - `mode: "character_sheet" | "storyboard_panels" | "single_panel"`
  - `prompt: string` (Director-authored, includes locked style spec)
  - `reference_urls?: string[]` (existing character/storyboard images to stay on-model)
  - `count?: number` (1 for character_sheet, up to 9 for storyboard_panels)
  - `aspect_ratio?: "1:1" | "16:9" | "9:16"`
- For each generated image: upload to `director-uploads` bucket under the caller's user id, return signed URL + storage_path.
- Returns `{ images: [{ url, storage_path, shot_index? }] }`.
- Handles 429 (rate limit) and 402 (credits) with structured errors so the chat surfaces them clearly.
- `verify_jwt = true` (default); validates caller via JWT.

### 2. Director tool — `supabase/functions/director-agent/index.ts`

Add one tool exposed to Gemini:

- `generate_reference_image` with the same shape as the edge function input.
- System prompt additions in a new `IMAGE GENERATION` section:
  - Use only when the user is missing a character sheet OR missing storyboard panels OR explicitly asks for a starting frame.
  - For `character_sheet`: always echo the locked visual spec (style, lighting, color grade) verbatim in the prompt so the character matches the planned look.
  - For `storyboard_panels`: must pass the character image as `reference_urls` and generate `count` panels in one call, each prompt prefixed with `Shot N of N:` and the per-shot beat.
  - Never use this tool to make "art" the user didn't ask for. Never compete with image-only tools.
- After the tool returns, the Director inlines the new images as `Attachment[]` on the assistant turn with the correct `role` + `shot_index`, then proceeds with the normal `ask_model_choice` → `generate_storyboard_batch` flow already built.

### 3. Client wiring — `src/lib/director/api.ts`

- Add `generateReferenceImage(input)` thin wrapper that calls the edge function. Used only by the director-agent server; client-side call exists only for retry/regenerate buttons on the result card.

### 4. UI — extend existing cards, no new surfaces

- `PromptResultCard` / new tiny `GeneratedImageCard.tsx`:
  - When the assistant turn includes attachments with `role: "character"` produced by the tool, show a single thumbnail with `Use as character` (already auto-locked) and `Regenerate`.
  - When attachments are `role: "storyboard"` with shot_index 1..N, render as a 3×3 grid mirroring the existing `StoryboardResultCard` layout, with `Regenerate panel` per cell and `Regenerate all`.
- No Composer button. No "Images" tab. No download UI — images live attached to the chat turn that created them and flow naturally into video gen.

### 5. Storage

- Reuse existing `director-uploads` bucket. No new bucket, no new table.
- Generated images are first-class `Attachment`s; they ride the same `attachments` payload that goes to `generate_storyboard_batch` and `generate-video`.

## Out of scope

- Standalone image generation page or Composer "Generate image" button.
- Image-only download/export UI.
- Inpainting, masking, style transfer between user images.
- Animatic preview from generated panels.

## Acceptance

- User drops a 3×3 board only, says "design a character that fits". Director generates one character sheet, locks it as `role: "character"`, then continues into model + spec selection → 9 on-model video prompts → render all.
- User drops a character only, says "build me a 9-shot story about him". Director proposes a beat sheet, generates 9 panels in one call as `role: "storyboard"` + `shot_index: 1..9`, renders the 3×3 grid card, then continues into prompts → render.
- A 429 or 402 from Lovable AI surfaces in chat as a clear, actionable message (not a generic failure).

## Files touched

- `supabase/functions/generate-reference-image/index.ts` (new)
- `supabase/functions/director-agent/index.ts` (new tool + IMAGE GENERATION section)
- `src/lib/director/api.ts` (client wrapper for regenerate buttons)
- `src/components/director/GeneratedImageCard.tsx` (new, small)
- `src/components/director/DirectorChat.tsx` (render the new card when tool output arrives)
