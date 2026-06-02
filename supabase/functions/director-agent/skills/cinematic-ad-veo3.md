---
name: cinematic-ad-veo3
target_model: veo-3.1
description: Photoreal cinematic ad — single sustained take, native audio, real focal lengths, named-DP style references. Trigger on "cinematic ad", "premium spot", "luxury commercial", "film-like ad", "30 second hero", "brand film", "lubezki", "deakins", "anamorphic spot".
triggers:
  - cinematic ad
  - cinematic commercial
  - brand film
  - luxury commercial
  - premium spot
  - hero spot
  - film-like ad
  - movie-like ad
  - 30 second spot
  - 30s spot
  - anamorphic spot
  - sustained take
  - one-er
  - lubezki
  - deakins
  - malick
  - kubrick
---

# Cinematic Ad — Veo 3 / 3.1

## When to use

Trigger this skill when the user wants a **photoreal brand or product film** that reads like cinema — not a UGC clip, not a stylized social hook, not motion graphics. Specifically:

- "cinematic ad", "brand film", "premium / luxury commercial", "hero spot", "30-second film"
- "shot on Alexa / Arri / 35mm", "anamorphic", "sustained take", "one-er", "no cuts"
- "Deakins lighting", "Malick magic hour", "Lubezki natural light", "Kubrick perspective"
- product is hero (perfume, watch, automotive, fashion, beverage)

**Defer to other skills if:**
- < 6 seconds and the goal is a scroll-stopper → use `social-hook-3s`
- needs a multi-shot product showcase montage → use `product-launch-kling`
- needs lip-synced dialogue performance → handle in default Veo path
- stylized 2D/3D animation → not this skill

## Core principle

A cinematic ad is **one sustained breath, not a sequence of cuts**. Veo 3.1's strongest muscle is temporal coherence — light, subject, and camera holding their identity across 8–12 seconds without drift. Write the prompt as a **single continuous take** the operator could perform on set. If the script needs cuts, you are using the wrong skill.

Every choice must be motivated: practical lights, real focal lengths, a real camera move with a real reason. No "epic", no "stunning", no "beautiful" — those words tell the model nothing. Specify the lens, the f-stop, the Kelvin temperature, the move, the floor.

## Prompt structure (load-bearing — do not reorder)

The Veo `mainPrompt` is **flowing prose**, 150–230 words, in this exact narrative order:

1. **SCENE** — location, time of day, atmosphere, who/what is in frame, wardrobe / product placement.
2. **ACTION** — what unfolds across the duration, beat by beat, in present tense.
3. **CAMERA** — lens (real mm), aperture, height, movement (static / push-in / dolly / handheld micro-drift / steadicam orbit). Name the DP style if appropriate.
4. **LIGHTING** — key source (motivation + Kelvin), fill, rim/practical, quality (hard / soft / wrap). One paragraph, not bullets.

Then close with the single non-negotiable line:

> "Sustained continuous take — no cuts, no lighting shifts, no scene drift."

## Block-by-block guidance

### SCENE (40–60 words)
✓ "Inside a Tokyo whisky bar at 1 a.m., a single Suntory Hibiki bottle sits on a backlit copper shelf. Behind it, soft bokeh of amber sodium street lights through rain-beaded glass."
✗ "A beautiful bar with a whisky bottle." — no anchor, no time, no atmosphere.

### ACTION (40–60 words)
Write in **present tense, single thread**. One subject doing one thing. No second character entering, no scene change.
✓ "A bartender's gloved hand enters frame, lifts the bottle, tilts it, and a single amber pour falls into a cut-crystal glass below. Steam from a nearby ice block curls past the lens."
✗ "The bartender pours the drink. Then the customer takes a sip. Then we cut to outside." — too many beats, implies cuts.

### CAMERA (30–50 words)
Always specify: **lens (mm), aperture, height, move, framerate if non-default**. Reference real DP work only when it sharpens intent.
✓ "85mm at f/2.0, eye level with the bottle, locked-off static for the first beat then a 6-inch dolly-in motivated by the pour. Deakins-style restraint — no flares, no shake. 48fps."
✗ "Epic cinematic camera movement." — meaningless to the model.

### LIGHTING (30–50 words)
Specify **motivation + Kelvin + direction + quality**.
✓ "Key: warm 2800K practical from the backlit shelf, hitting the bottle from behind to glow the amber liquid. Fill: cool 4500K spill from off-camera street light, low and from camera-right. Hard rim on the glass edge from the copper shelf reflection. No supplemental fixtures."
✗ "Beautiful warm lighting." — no direction, no temperature.

### Closing line (verbatim)
"Sustained continuous take — no cuts, no lighting shifts, no scene drift."

## Scene-specific templates

### Hero product on surface (perfume, watch, whisky, fragrance)
SCENE: tight environment + single product hero
ACTION: one human hand enters → manipulates product → product settles
CAMERA: 85mm or 100mm macro, f/2.0–f/2.8, static-into-micro-dolly
LIGHTING: backlit practical key + cool ambient fill, hard rim on product edge

### Driving scene (automotive, lifestyle)
SCENE: interior of the car at golden hour, single driver, landscape passing through window
ACTION: hand on wheel, slow turn, gaze shifts to side mirror, settles forward
CAMERA: 35mm at f/2.8, mounted dashboard POV, micro-vibration only, 24fps
LIGHTING: 5600K sun raking from camera-left through windshield, 3200K dash glow as fill, no supplemental

### Atelier / craft (fashion, watchmaking, leather, jewelry)
SCENE: workbench close-up, single artisan's hands
ACTION: one tool stroke / one stitch / one polish pass
CAMERA: 100mm macro at f/2.8, eye-level with the work, locked off
LIGHTING: single 3000K tungsten boom from frame-left, soft 4000K bounce card on right, deep shadow background

## Continuity anchors (only relevant for handoff to multi-shot)

If the user later requests a second shot to cut alongside this one, repeat verbatim across both prompts:
- Lens character ("85mm anamorphic, f/2.0, shallow DOF")
- Lighting setup ("2800K backlit practical, 4500K street fill from camera-right")
- Grade ("desaturated 80%, teal shadows at 200°, amber highlights at 35°")
- Stock ("35mm Kodak Vision3 500T grain")

## Model submission defaults

- **aspect_ratio**: 16:9 (cinematic) or 9:16 (social cinema) — ask once if ambiguous, never default silently
- **duration**: 8s for Veo 3.1, 6s for Veo 3.1 Fast/Lite. Longer = identity drift risk.
- **audio**: **always true** for Veo 3 / 3.1 — populate `audioBlock` with DIALOGUE (often `(none)`), SFX (specific diegetic sounds with rough timing), AMBIENT (room tone bed). Silence is a choice, not an omission.
- **negativePrompt** MUST include: `temporal artifacts, scene drift, sudden lighting change, lip-sync mismatch, audio-video desync, jump cut, hard cut, scene change`
- **referenceGuidance**: when an image is attached, lock start frame + product likeness + lighting direction

## Failure modes

| Symptom | Cause | Fix in prompt |
|---|---|---|
| Mid-clip lighting shift | Vague lighting paragraph | Specify Kelvin + direction + motivation explicitly |
| Subject morphs / face drifts | Too many beats, model invents cuts | Reduce ACTION to one continuous beat |
| Product looks plastic / CGI | Missing material + light interaction | Add "amber liquid catches the rim light; refraction through crystal" |
| Camera shake when you wanted locked | "Cinematic" implies handheld to Veo | Write "locked-off static" or "Steadicam at <0.3 ft/s drift" |
| Audio missing or generic | `audioBlock` left as one line | Always 3 sub-lines: DIALOGUE / SFX / AMBIENT |
| Hard cut appears anyway | Multiple verbs in ACTION | One subject, one action, one beat — and append the closing sustained-take line |

## Output discipline

- `mainPrompt`: **prose, never bracketed sections**. Veo is not Seedance.
- `cameraTags`: leave empty.
- `shotStructure`: leave empty (this skill is single-shot by definition).
- `audioBlock`: three sub-lines, always.
- `modelNotes`: tell the user this was written as a one-er — if they need cuts, switch skills.

## Few-shot

**User brief:** "30s premium whisky ad for Hibiki, Tokyo bar at night, no people on camera, very Deakins."

**Ideal mainPrompt:** "Inside a small Tokyo whisky bar just past 1 a.m., a single bottle of Suntory Hibiki sits on a backlit copper shelf. Behind it, soft bokeh of amber sodium street lamps through rain-beaded glass; a single cut-crystal tumbler waits below. A bartender's white-gloved hand enters frame from screen-right, lifts the bottle, tilts it slowly, and a single amber pour falls into the glass. Steam from a nearby ice block curls past the lens as the liquid settles. 85mm anamorphic at f/2.0, eye level with the bottle, locked-off static for the first three seconds then a 6-inch dolly-in motivated by the pour. Deakins-style restraint — no flares, no shake. 48fps. Key: warm 2800K practical from the backlit shelf, hitting the bottle from behind to glow the liquid. Fill: cool 4500K spill from off-camera street, low from camera-right. Hard rim on the glass edge from the copper shelf reflection. No supplemental fixtures. Sustained continuous take — no cuts, no lighting shifts, no scene drift."
