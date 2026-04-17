// Generic fallback agent — used for any target model not covered by a specialist.
// Preserves the original universal MovPrompt behaviour so existing models keep working.

import type { ExpertAgent } from "./registry.ts";

export const genericAgent: ExpertAgent = {
  id: "generic-director",
  displayName: "Universal Director",
  matches: () => true, // last-resort fallback

  docSummary: `UNIVERSAL MODEL GUIDANCE:
This agent serves all video generators not covered by a dedicated specialist (Hailuo/Minimax, Sora, Higgsfield, Wan, Grok, and "any model").
Goal: produce a model-agnostic cinematic prompt using clear universally-understood cinematography language.`,

  systemAddendum: `═══ TARGET MODEL: GENERIC / OTHER ═══
- mainPrompt: 150–250 words of well-rounded cinematic prose. Clear scene description, motivated camera, lighting, mood.
- Apply the per-family hints below ONLY if the target model matches:
  • HAILUO/MINIMAX: lead with environment, then subject. Continuous flow language. 150–300 words.
  • SORA: natural prose paragraph. Emphasize physical plausibility, gravity, momentum, cause-and-effect motion.
  • HIGGSFIELD: ultra-concise (50–120 words). Single clear motion or transformation.
  • WAN: emphasize light interaction with materials, atmospheric depth, volumetric layering.
  • GROK: lean into stylized, creative, surreal-friendly description.
- Leave audioBlock, cameraTags, referenceGuidance, shotStructure EMPTY unless the target model clearly benefits — keep output focused on the four core fields.
- negativePrompt MUST include the universal negatives.`,

  examples: `GENERIC EXAMPLE (single frame, moody portrait):
mainPrompt: "A young woman sits in a velvet armchair beside a rain-streaked window, warm tungsten lamplight painting amber highlights across her cheekbones while cool blue ambient light from the overcast sky fills the shadows. She slowly turns her gaze from the window toward camera, a faint melancholic smile forming. Shallow depth of field — the rain droplets on glass behind her dissolve into soft bokeh circles. A slow dolly-in from medium shot to medium close-up, 85mm lens, f/1.8. The curtain beside her sways gently in a draft."
negativePrompt: "morphing, distortion, blurry, watermark, text overlay, frame jumping, flickering, jittering, extra fingers, deformed hands, duplicate subjects, static expression, puppet-like motion"
cameraSuggestions: "Slow dolly in (medium to MCU), 85mm f/1.8, shallow DOF. Optional rack focus from window rain to subject's eyes mid-clip."
modelNotes: "Universal cinematic prompt — works across most modern video generators."
suggestedAspectRatio: "16:9"
suggestedDuration: "5s"`,
};
