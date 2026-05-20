# Better progress UX for story rendering

Quality and pipeline stay the same (Seedance 2.0 ref, 1080p, 15s, audio, 4 acts in parallel). The wait isn't going away — but right now the UI gives you nothing while it happens. Three small client-only changes make it feel much faster.

## 1. Tighter, adaptive polling

In `src/components/director/ActStrip.tsx`:

- Currently polls every 4s. Switch to **2s for the first 60s**, then **4s after** (renders that finish fast feel near-instant; long renders don't hammer the function).
- Reset back to 2s if a new act flips from `queued` → `processing`.
- Keep the existing immediate poll on tab focus / visibility (already wired via `refreshSignal`).

## 2. Per-act progress on each tile

Still in `ActStrip.tsx`, replace the static spinner with a richer state:

- **Elapsed timer** per tile (`0:42`) that ticks every second from the moment the act flips to `processing`.
- **Thin shimmer progress bar** under each tile using a soft cyan→amber gradient (project tokens), looping every ~3s — purely cosmetic but it removes the "frozen" feeling.
- **Status word** under the bar: "Queued" → "Rendering" → "Finalizing" (we flip to Finalizing after 90s, since that's typically when fal is muxing audio).
- **Footer line** on the strip: "Typically 3–6 min on Cinematic · 1080p · 15s · audio" plus a live "X / 4 done · longest elapsed Y:ZZ".

## 3. Preview the first act as soon as it lands

Today the ActStrip waits for all 4 acts before the user sees anything playable.

- The moment any tile flips to `completed`, expand it inline with a small autoplay-muted `<video>` (using the existing `VideoBubble`-style chrome, no new component needed if it stays simple).
- A subtle "Act 1 ready · 3 more rendering…" banner above the strip.
- When all 4 finish, the "Stitch into one video" button lights up (existing behavior).

## Files touched

- `src/components/director/ActStrip.tsx` — adaptive polling, per-tile timer + shimmer + status word, inline preview of completed acts, footer telemetry.

No backend, no schema, no API surface changes.

## Out of scope

- Changing model, resolution, duration, or audio (you chose to keep quality).
- Background browser notification when the render completes in another tab.
- Switching from polling to Realtime/SSE.
