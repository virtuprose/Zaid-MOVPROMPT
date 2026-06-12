# Image editing for AI Director

Add an editor that lets the user refine any generated image with prompt-only edits, brush-masked inpaint, subject swap, and erase — powered by `google/gemini-3.1-flash-image-preview` (Nano Banana 2). Each edit is saved as a new image; the original stays in the rail / chat history.

## Entry points

1. **Chat result bubble** — `GeneratedImageCard` gets a new "Edit" button next to the existing actions (Regenerate / Animate). Opens the editor dialog on that image.
2. **Media Rail expanded view** — `MediaRailPanel` expanded image overlay gets the same "Edit" button in its action toolbar.

Both call the same `ImageEditorDialog` component with `{ sourceUrl, sessionId, originBubbleId? }`.

## Editor dialog (`src/components/director/ImageEditorDialog.tsx`)

A single dialog with the source image centered and a right-side control rail. Four edit modes selectable via a small segmented control:

- **Prompt** — global transform, prompt only (e.g. "make it golden hour").
- **Paint** — brush over a region, prompt describes what should appear there (inpaint).
- **Swap** — brush over a subject, prompt describes the replacement (same pipeline as paint, different system hint).
- **Erase** — brush over an area, no prompt required; sends a "remove cleanly and fill background" instruction.

Canvas behavior for Paint/Swap/Erase:
- Overlay `<canvas>` matched to the image's intrinsic size. Pointer/touch draws a soft white circle into a separate mask canvas (black background).
- Brush size slider (8–120 px), Undo, Clear mask, Show/Hide mask toggle.
- On submit, the mask canvas is exported as a PNG data URL.

Footer: prompt textarea (hidden for pure Erase, optional), "Generate edit" primary button, credit cost chip, cancel.

## Backend — extend `generate-reference-image` (no new function)

The existing edge function already calls `google/gemini-3.1-flash-image-preview` with `image_url` parts. We extend it with an `op: "edit"` branch:

Request body additions:
```
{
  op: "edit",
  sourceUrl: string,           // existing generated image (https or data:)
  maskUrl?: string,            // PNG data URL, white = edit region (paint/swap/erase)
  mode: "prompt" | "paint" | "swap" | "erase",
  prompt: string,              // empty allowed only for erase
  aspectRatio?: string,
  sessionId?: string,
}
```

Gateway call: send the source image plus mask (when present) as two `image_url` parts, with a system-style text part instructing the model:
- prompt mode → "Apply this transformation to the entire image".
- paint mode → "Edit only the region marked white in the mask image; leave the rest pixel-identical".
- swap mode → "Replace the subject inside the white mask region with: …; keep lighting and surroundings consistent".
- erase mode → "Remove the content inside the white mask region; reconstruct the background plausibly".

Credit charge: reuse `priceFor("image_generation", { count: 1 })` already used for single-image generation. Refund on failure (same pattern as existing code at lines ~310/471).

Response: `{ url, sessionId, parentUrl: sourceUrl }` — same shape as today's generate response, so client code paths converge.

## Versioning / save behavior

- Each successful edit returns a brand-new image URL. The original stays untouched in the chat bubble and Media Rail.
- The new image is appended to the session's media via the existing `MediaRailContext.addItem(...)` with `meta: { parentUrl, editPrompt, editMode }` so the rail naturally shows the new version next to the original.
- When the editor was launched from a chat bubble, we also append a small assistant bubble: `"Edited image (mode: paint) — '<prompt>'"` with the new image card so it's discoverable in the conversation timeline.
- Optional badge "Edited" on cards whose `meta.parentUrl` is set.

## Files to add / change

Add:
- `src/components/director/ImageEditorDialog.tsx` — dialog, mask canvas, mode switcher, submit.
- `src/lib/director/imageMask.ts` — small helpers (init canvas at image size, export PNG mask, undo stack).
- `src/lib/director/editImage.ts` — typed client wrapper that calls `generate-reference-image` with `op: "edit"`.

Edit:
- `src/components/director/GeneratedImageCard.tsx` — add "Edit" action; wire dialog.
- `src/components/director/MediaRailPanel.tsx` — add "Edit" button to expanded image overlay.
- `src/components/director/MediaRailContext.tsx` — accept optional `parentUrl`, `editPrompt`, `editMode` in item meta; sort so children appear next to parents.
- `supabase/functions/generate-reference-image/index.ts` — branch on `op === "edit"`, build the edit prompt + mask payload, call gateway, charge/refund, return URL.

No schema changes, no new edge function, no new secrets — Lovable AI key is already available to the function.

## Technical notes

- Mask must match the source image's intrinsic resolution; downscale to ≤ 1536px longest edge before sending to keep request size reasonable.
- For very large source images (e.g. 4K upscales) we send the pre-upscale version when `meta.sourceBeforeUpscale` exists, then optionally re-upscale the result reusing the existing FAL upscaler.
- Brush operations are local-only until submit — no autosave drafts.
- Editor is keyboard-accessible: `[` / `]` resize brush, `⌘Z` undo, `Esc` close.

## Out of scope (can follow up later)

- Multi-step edit history with branching (we keep flat parentUrl).
- Outpainting / canvas extension.
- Per-edit fine-grained model picker (locked to Nano Banana 2 as requested).
