
## Why some preset previews look wrong (dolly-out, tilt-up, etc.)

### The root cause

Text-to-video models like **LTX**, **Wan**, and **Kling** generate **one continuous shot**. They don't understand editing-room jargon like *"dolly out"* or *"tilt up"* as instructions — they interpret them as descriptions of edits to apply, then often ignore them or do the opposite.

On top of that:

1. **Only 12 presets have hand-tuned `HERO_PROMPTS`** in `supabase/functions/generate-preset-preview/index.ts` (dolly-zoom, bullet-time, orbit-360, crash-zoom-in, whip-pan-right, fpv-drone, levitation, explosion, disintegration, glitch, lightning, mix-bullet-slow). Every other preset — including **dolly-out**, **dolly-in**, **tilt-up**, **tilt-down**, **pan-left/right**, **zoom-in/out**, etc. — falls through to `buildDynamicPrompt`, which just concatenates the label, description, and a generic scene hint. That's not enough motion guidance for the model.
2. **LTX (the new default for speed) is the weakest** of the three at interpreting abstract camera terminology — it especially struggles with vertical moves (tilt/pedestal/crane) and reverse moves (dolly out, pull out, crash zoom out). Kling handles them noticeably better but is 4× slower.
3. **The dynamic prompt doesn't translate the camera term into continuous motion language.** "Dolly Out" should become *"camera smoothly retreats backward away from the subject over 5 seconds, the subject growing smaller in frame as more environment is revealed on all sides"* — not just the label dropped into a sentence.

### The fix

**1. Add hand-tuned `HERO_PROMPTS` for the camera-move presets that are currently failing** — `supabase/functions/generate-preset-preview/index.ts`

Cover all `basic` and `epic` group presets that describe a **camera motion**. Each prompt:
- Picks a clear subject + environment that makes the move visible (e.g. dolly-out works best when there's something to reveal around the subject).
- Describes the move as **continuous physical camera motion over 5 seconds**, not as a cut/edit term.
- States what the **frame should look like at start vs. end** so the model has a clear trajectory.
- Avoids any wording the model might read as "two shots" or "a transition".

Approx 30 new entries (dolly-in/out, push-in, pull-out, pan-left/right, tilt-up/down, pedestal-up/down, zoom-in/out, snap-zoom, tracking, follow, drift, reveal, arc-left/right, crane-up/down, jib-up/down, orbit-left/right, whip-pan-left, crash-zoom-out, dolly-zoom-in/out, dutch-angle, birds-eye, worms-eye, steadicam, rack-focus).

Example shape:
```
"dolly-out":
  "Continuous dolly-out: camera smoothly retreats backward in one unbroken motion over 5 seconds, starting on a tight shot of a lone violinist in a candlelit cathedral, slowly revealing the empty pews, then the vaulted ceiling, ending wide. Locked horizon, steady glide on dolly tracks, no cuts, no edits, single continuous camera move, 35mm anamorphic, cinematic.",

"tilt-up":
  "Continuous tilt-up: camera body stays planted, lens angles smoothly upward in one unbroken 5-second motion, starting framed on the boots of a knight in armor, slowly revealing the chest plate, the helmet, then towering above into stormy sky. Single continuous tilt on a fixed pivot, no cuts, no zoom, 35mm anamorphic, cinematic.",
```

**2. Upgrade `buildDynamicPrompt` for any uncovered/custom presets** — same file

Rewrite the template to enforce continuous-shot framing for camera-move groups (`basic`, `epic`):

```
Continuous single-shot 5-second video. The camera performs ONE unbroken {label} move from start to finish — no cuts, no edits, no shot changes.

Move definition: {description}
What the audience should see: {bestFor}

Scene: {sceneHint}

Constraints: single continuous camera move, locked timing, 35mm anamorphic, dramatic lighting, photoreal, high detail. The {label} motion must be unmistakable and dominate the shot.
```

For non-camera groups (`effects`, `pulse`, `mix`) keep the current shape but also add `single continuous shot, no cuts` to the constraints.

**3. Auto-bump tricky moves to a stronger model** — same file

Add a small per-preset model floor. Camera-motion presets that are most failure-prone on LTX get auto-upgraded to **wan-fast** (still ~30s) when the admin's selected model is `ltx-fast`:

```ts
const HARD_FOR_LTX = new Set([
  "dolly-out","pull-out","tilt-up","tilt-down","pedestal-up","pedestal-down",
  "crash-zoom-out","crane-up","crane-down","jib-up","jib-down",
  "dolly-zoom","dolly-zoom-in","dolly-zoom-out","rack-focus",
]);
// after model resolution
if (model === "ltx-fast" && HARD_FOR_LTX.has(presetId)) effectiveModel = "wan-fast";
```

The submit response returns `effectiveModel` so the admin card shows e.g. *"Auto-upgraded to Wan for accuracy"* instead of silently switching.

**4. Surface the model swap in the UI** — `src/components/admin/PresetPreviewsSection.tsx`

When `effectiveModel !== requestedModel`, show a small inline note on the card during generation: *"Using Wan for this preset (LTX struggles with vertical/reverse moves)."* No layout changes.

### Out of scope
- Re-generating every existing preset preview (admin can selectively regenerate the bad ones from the admin panel).
- Changing the default model globally — LTX stays default for the ~80% of presets it handles fine.
- Adding new preset groups or DB columns.

### Files touched
- `supabase/functions/generate-preset-preview/index.ts` (HERO_PROMPTS additions, buildDynamicPrompt rewrite, HARD_FOR_LTX auto-upgrade, return `effectiveModel`)
- `src/components/admin/PresetPreviewsSection.tsx` (display auto-upgrade note)
