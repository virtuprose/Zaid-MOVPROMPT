## Goal

Stream storyboard panels from the edge function as they finish, and render each one in the chat the moment it lands — with a minimal "N / total" + thin progress bar.

## 1. Edge function — `supabase/functions/generate-reference-image/index.ts`

Add a streaming branch for the chained-storyboard case (`isChain && prompts.length > 1`). Other modes keep the current single-shot JSON response — no behavior change.

- Return `Response(stream, { headers: { ...corsHeaders, "Content-Type": "application/x-ndjson" } })` built from a `ReadableStream`.
- Emit NDJSON, one JSON object per line:
  - `{"type":"start","mode":"storyboard_panels","total":N}`
  - per panel result: `{"type":"panel","index":i+1,"value":{url,storage_path,shot_index}}` on success, or `{"type":"panel_error","index":i+1,"error":"..."}` on failure
  - `{"type":"done","missing":k}` at the end
- Charge credits up front exactly as today; refund missing panels before the final `done` line.
- Run the chain loop inside the stream (`start(controller)` → async IIFE → `controller.close()`), so each successful panel is flushed immediately.

## 2. Client API — `src/lib/director/api.ts`

Add a sibling helper that does a raw `fetch` against `${VITE_SUPABASE_URL}/functions/v1/generate-reference-image` so we can read the body stream (`supabase.functions.invoke` buffers, can't stream).

```ts
generateReferenceImageStream(input, onProgress): Promise<{mode, images}>
```

- Auth: pull `(await supabase.auth.getSession()).data.session?.access_token` and send as `Authorization: Bearer …` (same as the existing invoke flow).
- If response `Content-Type` is JSON (server fell back to non-stream path), behave like the existing helper.
- Otherwise read with `TextDecoderStream` + line buffering, dispatch each parsed event through `onProgress`, accumulate `images`, resolve with the final aggregate.
- Keep the existing `generateReferenceImage` for non-storyboard callers.

## 3. DirectorChat — `src/components/director/DirectorChat.tsx`

In `runImageGeneration` (around lines 334–399), when `payload.mode === "storyboard_panels"`:

- Insert the `generated_images` bubble immediately with `images: []` and `progress: { done: 0, total: N }` (N derived from `per_shot_prompts?.length ?? payload.count ?? 9`).
- Replace the loading text bubble with a quieter "Rendering panels…" or remove it (the progress bar replaces it).
- Call `generateReferenceImageStream` with an `onProgress` that, on every `panel` event, updates that bubble's `images` array (push by shot_index order) and bumps `progress.done`.
- On `done`, swap `progress` for the final state (clear it once `done === total`), then run the existing attachment + carrierBubble + persist block using the accumulated images.
- Errors / partial failures keep the panels that did arrive; refund is handled server-side.

Other modes (`character_sheet`, `single_panel`, single-panel regen) keep the current path — no streaming, no UI change.

## 4. GeneratedImageCard — `src/components/director/GeneratedImageCard.tsx`

Extend the bubble data type with an optional `progress?: { done: number; total: number }`.

Minimal progress UI (only when `progress && progress.done < progress.total`):

- A 1px-thin bar pinned under the header row: `<div class="h-px bg-muted overflow-hidden rounded-full"><div class="h-full bg-primary transition-all" style={{width: ${done/total*100}%}} /></div>`
- Replace the right-side status chip with `Rendering · {done} / {total}` while in progress; revert to "Locked as references…" when complete.
- Render placeholder tiles for the missing slots in the grid: same `aspect-square` card with a subtle pulse (`bg-muted/30 animate-pulse`) and a tiny shot number in the corner, so the grid keeps its shape and panels pop in place.

## Out of scope

- Streaming character sheets or single-panel generations.
- Server-Sent Events framing (NDJSON is simpler and works with `fetch` body reader).
- Cancellation / abort UI.