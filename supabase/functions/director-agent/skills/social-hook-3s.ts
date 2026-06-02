// AUTO-GENERATED from social-hook-3s.md — do not edit directly; edit the .md and re-run loader script.
export default `---
name: social-hook-3s
target_model: kling-2.1
description: 3-second vertical scroll-stopper. Frame-1 pattern interrupt, frame-2 payoff, zero held beats. Use for TikTok hooks, Reels openers, ad pre-rolls, scroll-stopping product reveals. Trigger on "social hook", "3 second", "scroll stopper", "tiktok hook", "reels hook", "thumbnail-in-motion", "pre-roll".
triggers:
  - social hook
  - scroll stopper
  - scroll-stopper
  - tiktok hook
  - reels hook
  - reel hook
  - 3 second
  - 3-second
  - 3s hook
  - pre-roll
  - preroll
  - thumb stopper
  - thumb-stopper
  - thumbnail in motion
---

# Social Hook — 3 seconds vertical

## When to use

Trigger when the user wants a **3-second vertical clip whose only job is to stop a thumb mid-scroll**. Not a cinematic ad. Not a sequence. Not a story.

- "social hook", "scroll stopper", "thumb stopper", "TikTok hook", "Reels opener"
- "pre-roll", "first 3 seconds", "ad hook", "thumbnail in motion"
- duration is explicitly ≤ 3 seconds and the format is 9:16

**Defer to other skills if:**
- ≥ 6 seconds or 16:9 → \`cinematic-ad-veo3\`
- multi-shot product reveal → \`product-launch-kling\`
- narrative or character moment → not this skill

## Core principle

Cinema is held beats. **Social hooks are the opposite — frame-1 is the pattern interrupt, frame-2 is the payoff, and there is no third beat.** The viewer's thumb is already moving when the clip starts. You have ~600ms to break the scroll pattern, ~1.4s to deliver the payoff, ~1s for the resolution that earns the rewatch.

Two failure modes dominate:
1. **Treating it like a tiny film.** Slow push-ins, atmosphere, mood — all wasted at this scale. The viewer is gone.
2. **Cramming 5 ideas in.** One interrupt, one payoff. That is the entire content.

Everything in this skill enforces those two rules.

## Prompt structure

The Kling \`mainPrompt\` is a single tight paragraph organized around exactly **two beats**:

\`\`\`
FRAME 1 (0.0–1.2s) — INTERRUPT: <unexpected visual that breaks scroll pattern>.
FRAME 2 (1.2–3.0s) — PAYOFF: <the satisfying reveal or punchline>.
CAMERA: <lens, framing, single decisive move>.
LIGHT: <one key, hard, motivated, single Kelvin>.
END FRAME: <static composition the viewer can screenshot>.
\`\`\`

Total: 80–120 words. Anything longer is wrong for this skill.

## Block-by-block guidance

### FRAME 1 — INTERRUPT (≤ 25 words)
The visual must be **unexpected, motion-led, and decodable in one glance**. The viewer's pattern-recognition decides in 400ms whether to keep scrolling.

✓ "A perfectly stacked tower of espresso cups, balanced on a single finger, mid-wobble."
✓ "A sneaker dropping from off-frame top, frozen mid-air against a saturated magenta cyclorama."
✗ "A nice coffee shop in the morning with a barista preparing drinks." — no interrupt, just an establish.

**Allowed interrupt patterns:**
- Impossible physics (levitation, anti-gravity, mid-air freeze)
- Extreme close-up of an unexpected texture (wet paint, melting wax, slow-pouring honey)
- Color-block environment (single saturated cyclorama, no real-world setting)
- Mid-action freeze (mid-jump, mid-pour, mid-shatter)
- Scale shock (tiny object huge in frame, or vice versa)

### FRAME 2 — PAYOFF (≤ 30 words)
The payoff **must resolve the interrupt**. If frame-1 wobbles, frame-2 catches or shatters. If frame-1 freezes mid-air, frame-2 lands.

✓ "The tower collapses in slow motion; cups tumble into a perfectly arranged grid on the counter below — product logo revealed underneath."
✗ "The barista smiles and goes back to work." — no payoff, no closure.

### CAMERA (≤ 15 words)
**One lens, one move.** No multi-camera, no cuts, no zooms-during-the-shot.

✓ "50mm, 9:16, locked-off static — the action moves, the camera does not."
✓ "24mm, 9:16, single fast snap-zoom from frame-1 to frame-2."
✗ "Multiple angles with dynamic editing." — wrong skill, wrong format.

### LIGHT (≤ 20 words)
**One source, hard, single Kelvin.** Hooks live or die on contrast — soft three-point lighting reads as bland.

✓ "Single hard 5600K key from camera-right at 30° above. Deep shadows. No fill."
✗ "Soft, even lighting." — invisible in a feed.

### END FRAME
Describe the **final 0.3s composition** the viewer can screenshot. This is what gets shared, saved, and remembered.

✓ "Final frame: cups arranged in a perfect 3×3 grid, brand logo centered, single hard shadow stretching to frame edge."

## Scene-specific templates

### Product drop (sneakers, gadgets, fragrance)
- INTERRUPT: product frozen mid-air against saturated cyclorama
- PAYOFF: lands on a plinth, slight bounce, settles centered
- CAMERA: 35mm locked-off
- LIGHT: single hard 5600K from above

### Food / drink
- INTERRUPT: extreme macro of pour mid-air, frozen
- PAYOFF: liquid completes the pour, fills glass, rim splash
- CAMERA: 100mm macro locked-off
- LIGHT: single 3000K hard key from frame-back, backlit pour

### Lifestyle / fashion
- INTERRUPT: model mid-motion, fabric mid-flight against color block
- PAYOFF: pose resolves, fabric settles in a precise silhouette
- CAMERA: 50mm static, slight low angle
- LIGHT: single hard 5600K key from camera-left

### Impossible / surreal
- INTERRUPT: object defying physics (floating, inverted, multiplying)
- PAYOFF: reveal of the trick (mirror, suspension, edit)
- CAMERA: 35mm static
- LIGHT: hard top light, single Kelvin

## Model submission defaults

- **aspect_ratio**: **9:16 always**. If the user said 16:9, this is the wrong skill.
- **duration**: **3s hard** (Kling 2.1). 2s for Kling 2.1 Fast.
- **audio**: Kling is silent — \`audioBlock\` empty in the payload. In \`modelNotes\`, prescribe a single hard SFX on the payoff beat (whoosh, thud, glass clink) — this is what the editor will add.
- **negativePrompt** MUST include: \`slow build, atmospheric mood, soft lighting, multiple cuts, complex narrative, dialogue, two distinct subjects, text overlay, watermark\`
- **referenceGuidance**: if a product image is attached, the interrupt is the product in an impossible state, payoff is the product resolved.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Reads as boring | No pattern interrupt in frame 1 | Rewrite FRAME 1 around an impossible/unexpected visual |
| Feels slow | "Push-in", "drift", "slowly" verbs | Replace with snap, drop, freeze, land |
| Too many ideas | Three or more beats | Cut to exactly two beats |
| Lighting reads flat | Multi-source soft setup | One hard key, one Kelvin, deep shadows |
| 16:9 instead of 9:16 | Default leaked through | Hard-set 9:16 in the payload |
| Viewer doesn't remember it | No screenshot-able END FRAME | Add a static, centered, brand-anchored final composition |

## Output discipline

- \`mainPrompt\`: the 5-line structure above, exactly, single paragraph allowed.
- \`cameraTags\`, \`shotStructure\`: leave empty.
- \`audioBlock\`: empty (Kling silent), but document the intended payoff SFX in \`modelNotes\`.
- \`modelNotes\`: spell out the one SFX the editor should drop on the payoff beat — this is the second half of the hook.
- \`next_suggestions\`: always offer "Swap interrupt", "Tighter on payoff", "Stronger end frame", "Try 2s version".

## Few-shot

**User brief:** "3 second TikTok hook for a new espresso brand, surprising visual."

**Ideal mainPrompt:** "FRAME 1 (0.0–1.2s) — INTERRUPT: a perfectly stacked tower of nine white espresso cups balanced on a single fingertip against a saturated cobalt-blue cyclorama, mid-wobble, one cup tilting past the point of return. FRAME 2 (1.2–3.0s) — PAYOFF: the tower collapses in 96fps slow motion; the cups tumble downward and land in a perfect 3×3 grid on a glossy black counter below — brand logo printed on each saucer, now revealed in formation. CAMERA: 50mm, 9:16 vertical, locked-off static — the action moves, the camera does not. LIGHT: single hard 5600K key from camera-right at 30° above; deep shadows pooling left; no fill. END FRAME: nine cups in a perfect 3×3 grid, brand logo centered across all nine saucers, single hard shadow stretching to frame edge."

**modelNotes:** "Kling 2.1 is silent. Editor: drop one whip-pan whoosh at 0.0s and a single porcelain-clink stack at 2.6s when the grid lands. That second SFX is the hook's hook."
`;
