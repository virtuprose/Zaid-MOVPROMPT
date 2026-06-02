## Goal

Make the transition audition in `TransitionPreview` frame-accurate at 24 fps, with draggable per-transition markers that adjust both the cut point and the overlap length, and a scrubber that snaps to frame boundaries when Shift is held.

## What changes (UX)

- **Frame grid**: all timing rendered and snapped to 1/24 s (≈41.67 ms). Display time as `m:ss:ff` (frames) instead of `m:ss.t`.
- **Per-transition overrides** (stored per-clip-boundary, reset when clips/transition preset change):
  - `offsetFrames` — shifts the cut point earlier (−) or later (+) along clip A.
  - `overlapFrames` — overrides the blend window length (defaults from preset: hard 0 / crossfade 12 / match 4).
- **Markers**: each boundary shows a draggable diamond at the cut point and two handles framing the shaded overlap region. Tooltip shows local offset (e.g. `+3f` / `12f overlap`).
- **Scrubber**: free by default; **hold Shift** to snap to nearest frame. Left/Right arrow keys step ±1 frame, Shift+Arrow steps ±1 second (always frame-aligned).
- **Reset per-marker**: double-click a marker to clear its override back to the preset defaults.
- **HUD**: timecode badge updated to `00:04:11` style; overlap badge shows `12f (500 ms)`.

## What changes (logic)

- Replace the constant `TRANSITION_CONFIG` overlap with `defaultOverlapFrames` per preset; convert to seconds via `FPS = 24`.
- Recompute `starts[]` from per-transition overrides each time they change:
  `start[i] = start[i-1] + dur[i-1] − overlap[i-1] + offset[i-1]` (clamped ≥ 0, and overlap clamped to `min(dur[i-1], dur[i]) − 1f`).
- Blend `opacityB` uses the per-transition overlap; if overlap = 0 → hard snap regardless of preset.
- Export recorder reuses the same overrides so the downloaded preview matches what was auditioned.
- Scrubber `onValueChange` snaps to nearest frame when `event.shiftKey` is true; otherwise stays at ms precision.

## Where

- `src/components/director/TransitionPreview.tsx` — all changes live here. New helpers (frame ↔ seconds, `fmtTC`) and a small `overrides` state map keyed by boundary index. Drag handling via pointer events on the timeline track.
- No backend / stitch endpoint changes — server-side stitch already accepts the chosen transition; per-marker overrides only affect the local audition + exported preview MP4 for now.

## Out of scope

- Persisting overrides to the database or applying them to the server-side ffmpeg stitch (can be a follow-up: pass `transitions[]` array to `story-stitch`).
- Per-clip fps detection (using fixed 24 fps as requested).
