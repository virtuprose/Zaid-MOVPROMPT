## Diagnosis — why your videos feel weak

I pulled the storyboard pipeline apart. The image model (`google/gemini-3.1-flash-image-preview`) is fine; the problem is **what we send it for each panel**.

Today, when the Director triggers `generate_reference_image` mode `storyboard_panels`, each panel prompt is built like this:

```
Shot 3 of 6: she opens the door and steps inside.
```

That's it. No lens, no lighting, no color grade, no composition, no aspect framing language, no "no text / no captions" guard. Compare that to the opening **key frame**, which gets a polish suffix:

```
… cinematic composition, intentional depth of field, controlled lighting,
clean negative space. No text, no captions, no watermark, no UI overlays.
```

That's why the key frame looks great and the storyboard panels look like rough drafts. The video model (Seedance / Kling / Veo) then renders motion off those drafts — and amplifies every weakness (flat lighting, drifting grade, identity wobble, bad framing). So the *real* fix is upstream: **make every panel as polished and as locked as the hero key frame**.

## Fix — three layers

### Layer 1 — Edge function (`supabase/functions/generate-reference-image/index.ts`)

The single highest‑leverage change. Today only `single_panel` with no reference gets `HERO_FRAME_SUFFIX`. We extend that idea to every storyboard panel and tighten continuity.

1. **`PANEL_POLISH_SUFFIX`** — appended to every storyboard panel prompt:
   > "Single polished storyboard frame at this aspect ratio. Cinematic composition, deliberate negative space, lens‑correct geometry, controlled depth of field, motivated lighting with clear key/fill/rim, color grade matches the previous panel exactly, no draft sketch quality, no rough lines. No text, no captions, no watermark, no UI overlay, no on‑image labels."
2. **Stronger continuity clause** — current clause only mentions wardrobe / face / props. Extend to: *"Match the previous panel's lens, focal length, lighting direction, color grade, film stock, contrast, and atmospheric density. Same world, same time of day, same weather."*
3. **Accept an optional `style_spec` payload** on the edge function: `{ lens, lighting, palette, film_emulation, grade, mood }`. When present, render it as a one‑line "LOCKED STYLE" header pre‑pended to every panel prompt (and to character_sheet) so the locked spec lives inside the image call instead of trusting the Director to re‑echo it correctly each time.
4. **Reinforce aspect** in panel prompts — append `"Frame composed for ${aspect} — no letterboxing, no pillarboxing, no border bars."` so the model stops cropping to its default 1:1.

### Layer 2 — Director system prompt (`supabase/functions/director-agent/index.ts`)

Tighten the contract for what each `per_shot_prompts[i]` MUST contain. New hard rule in the IMAGE GENERATION section:

> Every entry in `per_shot_prompts` MUST be 30–60 words and MUST name, in order: (a) subject + micro‑action (1 sentence, present tense), (b) shot type + camera position (WS / MS / CU / OTS / insert + low/eye/high angle), (c) camera move (static / slow push / dolly / pan / handheld micro‑drift), (d) lens (focal length range), (e) lighting (key direction, fill ratio, practicals, time of day), (f) mood / emotional beat in 3 words. Single‑clause beats like "she opens the door" are rejected.

Also add a `style_spec` field to the `generate_reference_image` tool schema so the Director passes the locked DP spec through verbatim every call — no more relying on it being baked into each `per_shot_prompts[i]` correctly.

For multi‑panel calls, require the Director to include a one‑line **shot‑to‑shot grammar plan** in `directors_note` BEFORE the call (e.g. "Cut from WS → MCU → insert → OTS → MS → WS. Light moves clockwise across the sequence."). This forces it to think cinematically, not just listing beats.

### Layer 3 — UI (`src/components/director/GeneratedImageCard.tsx`)

Two small additions on the existing storyboard card:

1. **"Polish this panel" inline action** per panel — opens a tiny popover with: shot type, camera move, lighting, mood (editable chips), then re‑runs `regen()` for that single panel with the upgraded prompt. Reuses the existing per‑index regenerate path.
2. **"Re‑light the whole sequence"** button on the finished storyboard card — re‑runs all panels with a tighter `style_spec` (same shot beats, but the user can flip the lighting/grade/film stock in one place and propagate to every panel).

## Out of scope

- Switching image models. `gemini-3.1-flash-image-preview` is fine once the prompts upstream are right; jumping to a heavier model would only mask the prompt issue and cost more credits.
- Changes to the video render path itself (`generate-video`, `submitVideoJob`). The reference frames are what feed the video model — fix those and the video result tracks automatically.
- The Composer / chat surface — no changes to how the user talks to the Director.

## What you'll feel after this

- Storyboard panels will look like finished cinematography stills, not sketches.
- The grade, lighting direction, and lens feel won't drift between panel 1 and panel 6.
- The video model will have a much stronger visual anchor to extrapolate motion from, so the final clip inherits the polish instead of fighting it.
