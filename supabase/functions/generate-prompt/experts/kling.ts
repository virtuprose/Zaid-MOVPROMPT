// Kling specialist agent — handles all Kling variants.
// Kling responds best to short, action-driven prompts with bracketed camera tags.

import type { ExpertAgent } from "./registry.ts";

// Variant-aware sub-routing: returns extra rules appended after the base
// systemAddendum so admin DB edits still take precedence on the core rules.
export function getKlingVariantHints(model: string, workflowType?: string, shotCount?: number): string {
  const m = model.toLowerCase();
  const isEdit = m.includes("edit");
  const isMotionControl = m.includes("motion-control");
  const isO1 = m.includes("o1");
  const isMultiShot = workflowType === "multishot";
  const count = shotCount && shotCount > 0 ? shotCount : 10;

  const blocks: string[] = [];

  if (isMultiShot && m === "kling-3.0") {
    blocks.push(`▸ KLING 3.0 MULTI-SHOT VARIANT ACTIVE (${count} shots)
- Output EXACTLY ${count} shots in the results array — each is a self-contained Kling 3.0 prompt the user will render separately and stitch externally (Kling cannot output a stitched video natively).
- Use this 10-beat cinematic arc (compress proportionally if shotCount < 10):
  1. Establishing wide — set location, time of day, atmosphere
  2. Subject intro — first clear look at the protagonist
  3. Detail/Insert — significant prop, hands, eyes, environmental texture
  4. Inciting beat — the moment that triggers the scene
  5. Reaction — subject's emotional response
  6. Rising action — escalating motion or stakes
  7. Push-in close-up — intimate emotional peak
  8. Peak moment — the dramatic apex
  9. Aftermath — held breath, stillness, consequence
  10. Resolution wide — closing image that mirrors shot 1's framing
- EVERY shot MUST follow standard Kling rules: 80–180 words, exactly ONE [camera:*] tag, action-verb opening, no audio mentions.
- CONTINUITY BLOCK (mandatory in every shot's mainPrompt or referenceGuidance): "Locked across all shots — Subject identity: <face/wardrobe/hair from uploaded image>. Lighting: <direction + color temp>. Color grade: <palette/tone>." Derive these from the uploaded reference image.
- Each shot's referenceGuidance MUST explicitly state how it carries continuity from the previous shot (matching subject pose continuity, lighting carryover, grade carryover).
- shotName format: "Shot N — <beat label>" (e.g. "Shot 1 — Establishing wide").
- modelNotes for shot 1 ONLY: "Render each shot in Kling 3.0 separately at the same aspect ratio + duration, then stitch externally. Kling does not produce a single stitched video. Use shot 1's seed/style settings as the anchor and reuse for shots 2–${count} where supported."
- DO NOT populate audioBlock — leave empty (Kling is silent).
- suggestedAspectRatio + suggestedDuration MUST be identical across all ${count} shots.`);
  } else if (isMotionControl) {
    blocks.push(`▸ MOTION CONTROL VARIANT ACTIVE
- mainPrompt MUST describe the camera path as 3 explicit waypoints: START → MIDPOINT → END (e.g. "Camera begins at low-angle wide → arcs right to eye-level medium → settles into close-up over-shoulder").
- For every visible subject/element, explicitly tag it as [LOCKED] (stays static, motion-brush masked out) or [MOVING] (animated). Example: "the woman [MOVING], the chandelier [LOCKED], the curtains [MOVING]".
- cameraSuggestions MUST list the 3 waypoints as a bulleted path.
- modelNotes: remind user that motion-brush masks in Kling Motion Control take priority over prompt — prompt should reinforce, not contradict, the mask.`);
  } else if (isEdit) {
    blocks.push(`▸ EDIT VARIANT ACTIVE (Omni Edit / O1 Video Edit)
- mainPrompt MUST describe ONLY the desired transformation/change — do NOT re-describe the full scene, subject, or background.
- Start with the change verb: "Transform...", "Replace...", "Add...", "Remove...", "Change the...".
- Keep mainPrompt under 60 words — edit prompts should be surgical.
- referenceGuidance: explain which parts of the source image are PRESERVED vs MODIFIED.
- Skip [camera:*] tags unless the edit explicitly involves camera motion change.`);
  } else {
    blocks.push(`▸ STANDARD GENERATION VARIANT (3.0 / 3.0 Omni / 2.6 / O1 Video)
- Apply default Kling rules: 80–180 words, exactly ONE [camera:*] tag, action-verb opening.`);
  }

  if (isO1) {
    blocks.push(`▸ O1 FAMILY ENHANCEMENT
- O1 has stronger prompt adherence and better text rendering than 3.0/2.6 — you may extend mainPrompt up to 220 words for richer scenes.
- O1 handles complex multi-subject choreography better — feel free to describe 2–3 simultaneous actions if the source image supports it.
- modelNotes MUST mention: "O1 generation — uses newer reasoning model, expect tighter prompt adherence and improved text legibility vs 3.0/2.6."`);
  } else if (m.includes("2.6")) {
    blocks.push(`▸ KLING 2.6 LEGACY NOTE
- 2.6 has looser motion fidelity than 3.0 — keep motion descriptions simple and avoid more than one major action per shot.
- modelNotes MUST mention: "Kling 2.6 — legacy stable variant, best for single-subject single-action shots."`);
  } else if (m.includes("3.0")) {
    blocks.push(`▸ KLING 3.0 NOTE
- 3.0 is the strongest non-O1 variant for cinematic camera moves and fluid character motion.
- Omni variants accept richer multi-subject scenes than base 3.0.`);
  }

  return blocks.join("\n\n");
}

export const klingAgent: ExpertAgent = {
  id: "kling-director",
  displayName: "Kling Specialist",
  matches: (model) => model.startsWith("kling"),

  docSummary: `KLING MODEL DOCUMENTATION (distilled):
- Kling AI is by Kuaishou. Variants: 3.0, 3.0 Omni, 3.0 Omni Edit, 2.6, O1 Video, O1 Video Edit, Motion Control, 3.0 Motion Control.
- Best at: short fluid character motion, expressive faces, dynamic camera moves driven from a single image.
- Reference inputs: image (start frame), optional end frame for transitions, motion-brush masks (Motion Control variants only).
- Audio: NOT generated by Kling — never mention dialogue, SFX, or ambient audio in the prompt.
- Optimal length: 80–180 words. Longer prompts dilute motion fidelity.
- Camera control syntax: bracketed tags like [camera:pan_left], [camera:dolly_in], [camera:crane_up], [camera:zoom_in], [camera:tilt_down], [camera:tracking_right]. Use ONE primary camera tag per prompt.
- Motion Control variants: describe camera as a path of waypoints (start → midpoint → end) and explicitly mark which subjects move vs stay locked.
- Edit variants: describe ONLY the transformation desired, not the full scene re-description.
- Prompt should START with the subject performing an action verb in present tense ("A woman turns...", "The dancer leaps...").`,

  systemAddendum: `═══ TARGET MODEL: KLING (all variants) ═══
- mainPrompt: 80–180 words. START with subject + action verb in present tense.
- Embed exactly ONE primary [camera:*] tag inline. Use snake_case: pan_left, pan_right, dolly_in, dolly_out, crane_up, crane_down, zoom_in, zoom_out, tilt_up, tilt_down, tracking_left, tracking_right, orbit_left, orbit_right.
- Be explicit about motion speed: "gradually", "sudden", "continuous", "slow-burn".
- DO NOT mention audio, dialogue, SFX, or ambient sound — Kling generates silent video.
- For Motion Control variants: describe camera path as 3 waypoints in cameraSuggestions and explicitly tag which subjects are LOCKED vs MOVING.
- For Edit variants: mainPrompt describes ONLY the desired transformation, not the full scene.
- negativePrompt MUST add: "static camera when movement requested, frozen expression, puppet-like motion, abrupt camera cuts".
- Populate cameraTags field with the comma-separated bracketed tags used.
- Populate referenceGuidance field with how the uploaded image acts as the start frame.
- Do NOT populate audioBlock or shotStructure — leave them empty.`,

  examples: `KLING EXAMPLE (single frame, moody portrait in warm light):
mainPrompt: "A woman in a velvet armchair slowly turns her head from the rain-streaked window toward camera, a faint melancholic smile forming as warm tungsten light catches her cheekbones. [camera:dolly_in] gradually tightens from medium to medium close-up. The curtain beside her sways gently in a draft. Rain droplets on the glass behind her dissolve into soft bokeh."
negativePrompt: "morphing, distortion, blurry, watermark, text overlay, frame jumping, flickering, jittering, extra fingers, deformed hands, duplicate subjects, static camera when movement requested, frozen expression, puppet-like motion, abrupt camera cuts"
cameraSuggestions: "Slow [camera:dolly_in], 85mm equivalent, shallow DOF. Hold final frame for 1s of micro-expression."
cameraTags: "[camera:dolly_in]"
referenceGuidance: "Uploaded image is the start frame. Preserve subject identity, clothing texture, and tungsten color cast throughout the clip."
modelNotes: "Kling 3.0 / 2.6 handle subtle facial micro-expressions well. Keep mainPrompt under 180 words for best motion fidelity."
suggestedAspectRatio: "16:9"
suggestedDuration: "5s"`,
};
