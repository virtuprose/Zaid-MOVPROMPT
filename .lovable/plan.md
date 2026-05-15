# Faster uploads + visual thumbnail previews

Two issues from your screenshot:
1. Uploading 6 references took too long because files are processed **one at a time**.
2. After upload, attachments show as tiny text chips (`3D Abstract Composition…`) — you can't see what's actually attached.

## Changes

### 1. Parallel ingestion — `src/components/director/Composer.tsx`
Replace the sequential `for (const f of files) { await ingest… }` loop with `Promise.allSettled(files.map(...))` so all 6+ files upload concurrently. Failed files surface their own toast; successful ones merge into `attachments`. Expected speedup: roughly Nx faster for N files (network-bound, not CPU-bound).

### 2. Parallel signed-URL creation — `src/lib/director/ingest.ts`
- Inside `ingestVideo`, the keyframe loop is also sequential. Extract frames sequentially (canvas is single-threaded) but **upload all frames in parallel** with `Promise.all`.
- No change to `ingestImage` / `ingestAudio` / `ingestDocument` internals — parallelism comes from the Composer-level batching.

### 3. Thumbnail grid for attachments — `src/components/director/Composer.tsx`
Replace the current chip row with a responsive thumbnail grid:

```text
┌──────┬──────┬──────┬──────┐
│ img  │ img  │ img  │ img  │   64–72px square tiles
│  ×   │  ×   │  ×   │  ×   │   remove button on hover, top-right
└──────┴──────┴──────┴──────┘
```

- **Image / video keyframe** → render the actual image (`<img src={a.url}>`) as a 64px rounded tile with `object-cover`.
- **Audio / document** → keep an icon tile (same 64px square) with the file icon centered and the filename truncated underneath in 10px text.
- Hover state: dim the tile and reveal a small `×` button in the top-right corner (no more inline X on the chip).
- Tooltip on hover shows the full filename.
- Use `flex flex-wrap gap-2` so tiles wrap naturally inside the composer; sits between the textarea and the action row, same place as today.

### 4. Loading state while ingesting
While `ingesting` is true, render skeleton tiles (one per pending file) at the end of the grid so the user sees progress immediately instead of staring at an empty composer. Skeletons disappear as each upload resolves.

## Out of scope
- No backend / edge function changes.
- No change to attachment data model — still `Attachment[]` with the same `kind` values.
- No change to the rest of the Director chat.
