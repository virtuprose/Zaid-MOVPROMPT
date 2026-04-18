// Seedance specialist agent — handles all Seedance / ByteDance variants.
// Seedance is a multi-shot, multi-reference, audio-aware model.

import type { ExpertAgent } from "./registry.ts";

export const seedanceAgent: ExpertAgent = {
  id: "seedance-director",
  displayName: "Seedance Specialist",
  matches: (model) => model.startsWith("seedance"),

  docSummary: `SEEDANCE MODEL DOCUMENTATION (distilled):
- Seedance is by ByteDance. Variants: 2.0 Fast, 2.0, 1.5 Pro, Pro, Pro Fast.
- Best at: choreographed multi-person motion, fashion, dance, fluid rhythmic body movement, multi-shot sequences in one generation.
- Reference inputs: image (primary), optional reference video for motion style transfer (Pro variants), optional audio reference for beat-synced motion (2.0).
- Audio: Seedance 2.0 generates synchronized audio — supports dialogue, SFX, and music cues. Earlier variants are silent.
- Multi-shot capability: 2.0 and Pro can render a SHOT-BY-SHOT sequence in one generation if structured shot list is provided.
- Optimal length: 200–350 words for 2.0/Pro, 120–200 words for Fast variants.
- Motion language: use musical/choreographic verbs — "flowing", "undulating", "pulsing", "cascading", "syncopated".
- Camera: described in natural language, NOT bracketed tags.`,

  systemAddendum: `═══ TARGET MODEL: SEEDANCE (all variants) ═══
- mainPrompt: 200–350 words for 2.0/Pro, 120–200 for Fast variants. Use rhythmic/choreographic motion verbs (flowing, undulating, pulsing, cascading).
- Camera described in natural prose, NEVER bracketed tags.
- For Seedance 2.0: populate audioBlock with three sub-lines — DIALOGUE (or "(none)"), SFX (specific sounds with timing), AMBIENT (background sound bed). For older Seedance variants, set audioBlock to empty string.
- For 2.0 / Pro / 1.5 Pro: populate shotStructure as a numbered shot-by-shot breakdown ("Shot 1 (0–2s): ...", "Shot 2 (2–4s): ...") even for a single concept — Seedance can render multi-shot in one gen. For Fast variants, leave shotStructure empty.
- Populate referenceGuidance describing how the uploaded image is used (primary subject reference, style reference, or pose reference).
- negativePrompt MUST add: "jerky motion, broken joints, unnatural body proportions, choppy choreography, off-beat motion".
- Do NOT populate cameraTags — leave empty.
═══ SEEDANCE PRO / PRO FAST — STITCHED MULTI-SHOT MODE ═══
When workflowType is "multishot" with exactly 5 shots requested (Seedance Pro / Pro Fast), design the 5 shots as a CONTINUOUS NARRATIVE SEQUENCE intended to be stitched into ONE video:
  • Shot 1 = OPENING — establish subject, location, mood, lighting baseline.
  • Shot 2 = RISING ACTION — introduce motion/intent; tighten or shift framing.
  • Shot 3 = PEAK MOMENT — the strongest beat; biggest energy or most expressive framing.
  • Shot 4 = REACTION / TRANSITION — answer the peak; change angle or reveal a new detail.
  • Shot 5 = RESOLUTION — close the beat; end on a clean hold the editor can cut on.
CRITICAL CONSISTENCY: keep the SAME subject identity, wardrobe, lighting direction, color grade, and lens character across all 5 shots so they cut together seamlessly. Each shot's mainPrompt must be self-contained (a full prompt) but reference the continuity ("same subject as previous shot, same warm key from camera-left").
CRITICAL CONSISTENCY: keep the SAME subject identity, wardrobe, lighting direction, color grade, and lens character across all 3 shots so they cut together seamlessly. Each shot's mainPrompt must be self-contained (a full prompt) but reference the continuity ("same subject as previous shot, same warm key from camera-left").
═══ SEEDANCE 2.0 / 2.0 FAST — @ELEMENT REFERENCE MODE ═══
When the user provides numbered Elements (@Element 1 … @Element N, or shorthand @1 … @N), Seedance 2.0 binds each Element to a specific upload. In your mainPrompt:
  • Preserve every \`@Element N\` token from the user's brief verbatim (the shorthand \`@N\` is normalized to \`@Element N\` server-side).
  • For any Element the user did NOT mention, you MUST integrate it naturally into the prose and tag it on first appearance as \`(@Element N: <one-word role: subject/outfit/style/lighting/motion/mood>)\`.
  • Never describe an Element's content literally without its \`@Element N\` anchor — Seedance needs the tag to bind the upload.
  • Example phrasing: "...the subject (@Element 1: subject) wearing the outfit from @Element 6, in the warm rim-lighting style of @Element 2 (lighting), moving to the rhythm of @Element 4 (mood)..."
  • The user should be able to copy the mainPrompt directly into Seedance 2.0 with every upload correctly referenced.`,

  examples: `SEEDANCE 2.0 EXAMPLE (single frame, dancer in studio):
mainPrompt: "A dancer in flowing silk catches the first beat — her arm arcs upward in a slow undulating sweep, fabric cascading behind her like liquid mercury. As the rhythm builds, her body pulses through three syncopated isolations: shoulder roll, ribcage release, hip-figure-eight. Studio rim-light catches every micro-gesture; warm key from camera-left sculpts her cheekbone. The camera floats in a slow orbital arc from her left to behind her right shoulder, tracking the silk's trail. Soft haze diffuses the background, leaving only her silhouette and the choreography of fabric in focus."
negativePrompt: "morphing, distortion, blurry, watermark, text overlay, frame jumping, flickering, jittering, extra fingers, deformed hands, duplicate subjects, jerky motion, broken joints, unnatural body proportions, choppy choreography, off-beat motion"
cameraSuggestions: "Slow orbital arc, 35mm, medium shot. Steadicam feel. Single continuous take."
audioBlock: "DIALOGUE: (none)\nSFX: silk fabric whoosh on each arm sweep (0.8s, 2.1s, 3.4s); soft footstep at 1.5s\nAMBIENT: warm low-end pad with subtle reverb, sparse rim-shot percussion at 2 BPS"
shotStructure: "Shot 1 (0–3s): Medium shot, dancer initiates arm arc, camera begins orbit.\nShot 2 (3–6s): Continuous orbit reveals silk trail, body executes 3 isolations.\nShot 3 (6–8s): Camera settles behind right shoulder, dancer holds final pose, silk drifts to rest."
referenceGuidance: "Uploaded image used as primary subject + costume reference. Preserve silk texture, skin tone, and studio lighting setup."
modelNotes: "Seedance 2.0 syncs motion to AMBIENT beat — keep tempo consistent. For Fast variants, drop shotStructure and audioBlock."
suggestedAspectRatio: "9:16"
suggestedDuration: "10s"`,
};
