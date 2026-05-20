## Add "Jump to Stitch" button when all 4 acts are ready

When all 4 acts finish rendering, the Stitch button can be far down the chat scroll. Add a floating quick-action that appears in the chat and scrolls/focuses the Stitch button inside the ActStrip.

### Changes

**`src/components/director/ActStrip.tsx`**
- Add a `ref` to the Stitch button (`stitchBtnRef`).
- Expose a stable `id` on the ActStrip root (e.g. `data-stitch-anchor={storyRenderId}`) and on the Stitch button (`data-stitch-button={storyRenderId}`).
- When `allDone` flips true, fire a one-shot custom event `vidoprompt:acts-ready` with `{ storyRenderId }` so the chat can react.
- Keep the existing first-ready banner; no behavior change there.

**`src/components/director/DirectorChat.tsx`** (or wherever ActStrip is rendered in chat)
- Listen for `vidoprompt:acts-ready`. When received, set local state `readyToStitch = storyRenderId`.
- Render a sticky pill at the bottom of the chat viewport (above the composer):
  - Label: "All 4 acts ready — Stitch story ↓"
  - Cyan→amber gradient, `Film` icon, `motion-safe:animate-fade-up`.
  - On click: `document.querySelector([data-stitch-button="${id}"])?.scrollIntoView({ behavior: "smooth", block: "center" })` then briefly add a `ring-2 ring-primary` highlight class to draw the eye.
- Auto-dismiss the pill once the user scrolls the Stitch button into view (IntersectionObserver) or after they click Stitch (listen for `stitchStatus === "running"`).

### Out of scope
- No changes to polling, rendering, stitching backend, or the Stitch button's own behavior.
- No changes to act tiles, banners, or layout.
