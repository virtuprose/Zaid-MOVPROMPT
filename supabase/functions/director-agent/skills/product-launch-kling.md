---
name: product-launch-kling
target_model: kling-2.1
description: 6-shot product launch sequence with locked continuity anchors. Use for product reveals, e-commerce hero films, sneaker drops, gadget unboxings, fragrance launches. Trigger on "product launch", "product reveal", "6 shots", "unboxing sequence", "drop video", "shot list", "multi-shot product".
triggers:
  - product launch
  - product reveal
  - product video
  - product showcase
  - launch film
  - unboxing
  - drop video
  - sneaker drop
  - shot list
  - 6 shot
  - multi shot product
  - hero film
---

# Product Launch — Kling 2.1 (6-shot sequence)

## When to use

Trigger when the user wants a **multi-shot product film** — a launch sequence the editor will cut together. Not a one-er, not a social hook.

- "product launch", "product reveal", "drop video", "hero film"
- "shot list", "6 shots", "multi-shot", "sequence", "montage"
- "unboxing", "sneaker drop", "fragrance launch", "watch reveal", "gadget showcase"

**Defer to other skills if:**
- single sustained take preferred → `cinematic-ad-veo3`
- 3-second social pattern interrupt → `social-hook-3s`
- needs choreographed human motion across the whole piece → Seedance specialist
- single shot only → Kling default expert

## Core principle

A launch sequence is **one product seen six ways**. The viewer must read the same object, same finish, same color, same lighting world across every shot — only the angle and the beat change. Continuity is built in the prompt, not in post. If shot 3's lighting drifts from shot 1's, the cut fails.

Kling 2.1 is the right engine because it locks subject identity well across short clips when the **anchor block is repeated verbatim**.

## Prompt structure (per shot)

Every shot's `mainPrompt` follows the same six lines, in this exact order:

```
[SHOT N of 6 — ROLE | Xs]
Beat: <one-sentence action>
Frame: <framing + lens + height + camera move>
Light: <continuity-locked lighting block — verbatim across all 6>
Product: <continuity-locked product block — verbatim across all 6>
Grade: <continuity-locked grade block — verbatim across all 6>
```

The three continuity blocks (**Light / Product / Grade**) are written **once** and copy-pasted into all six shots without a single word changed. This is the load-bearing rule.

## The 6-shot recipe (roles are fixed)

| # | Role | Purpose | Default framing |
|---|---|---|---|
| 1 | ESTABLISH | Anchor the world | Wide, product small in frame |
| 2 | APPROACH | Build anticipation | Medium, slow push-in |
| 3 | HERO | The product beauty shot | Tight, locked-off, longest hold |
| 4 | DETAIL | Texture / material proof | Macro, slow drift |
| 5 | CONTEXT | In-use / lifestyle | Medium, with a human hand or environment |
| 6 | RESOLUTION | Logo / packaging / final beat | Centered, settles, holds |

Each shot is 2–3 seconds. Total run after edit: 12–18 seconds.

## Block-by-block guidance

### `[SHOT N of 6 — ROLE | Xs]` header
Exact format. The bracketed header is the only place the model is told this is part of a sequence — without it, Kling treats each shot as standalone and continuity drifts.

### Beat (≤ 20 words)
One verb, present tense. No "and then".
✓ "Camera holds; the watch rotates a quarter turn on its display puck."
✗ "Camera moves around the watch while the light changes and the band shifts."

### Frame
Always: **framing keyword + lens (mm) + height + move**.
✓ "Medium close-up, 50mm at f/2.8, eye level with the dial, 4-inch dolly-in."
Framing keywords: wide / medium / medium close-up / close-up / extreme close-up / macro / overhead / low angle / profile.

### Light (verbatim across all 6)
Single paragraph specifying motivation, Kelvin, direction, quality.
Example anchor: *"Key: 3200K tungsten from frame-left at 45°, hard, motivated by an off-screen workbench lamp. Fill: 5600K daylight bounce from camera-right, soft, 2 stops down. Rim: cool 6000K kicker from behind-left to separate the product from the matte black background. No supplemental practicals."*

### Product (verbatim across all 6)
Locks the object's identity — material, finish, color, proportions.
Example anchor: *"Subject: a 41mm stainless steel Tudor Black Bay Pro, matte brushed case, glossy black dial, yellow snowflake hour hand, fabric NATO strap in olive green. Crown at 3 o'clock. Sapphire crystal with subtle anti-reflective coating."*

### Grade (verbatim across all 6)
Locks the look.
Example anchor: *"Desaturated 75%. Shadows pushed deep neutral with a 5% teal lift at 195°. Highlights held neutral. Blacks rich but not crushed. 35mm Kodak Vision3 250D grain at low intensity."*

## Continuity anchors (write once, paste six times)

Build a **continuity card** at the top of your reply before drafting the six shots:

```
CONTINUITY CARD (apply verbatim to all 6 shots)
Light: <…>
Product: <…>
Grade: <…>
```

Then for each shot, only the **header + Beat + Frame** change. Light / Product / Grade lines are byte-identical copies. If you find yourself rewording the Light line for shot 3 "to vary it" — stop. That is exactly the failure mode this skill exists to prevent.

## Model submission defaults

- **aspect_ratio**: 16:9 default. 9:16 if the user named a vertical platform. 1:1 only if asked.
- **duration**: 3s per shot (Kling 2.1 sweet spot). 2s for Kling 2.1 Fast.
- **audio**: Kling does not generate native audio. Leave `audioBlock` empty in the API payload, but include a single line in `modelNotes` describing the post-production sound design intent.
- **negativePrompt** per shot MUST include: `inconsistent lighting, product identity drift, color shift, material change, logo distortion, extra elements in frame, watermark, text overlay`
- **referenceGuidance**: the uploaded product image is the identity anchor — note that the Product block was written to match it.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Shot 3's product color drifts from shot 1 | Product block was reworded | Copy the Product block verbatim |
| Lighting direction flips between shots | Light block was reworded | Copy the Light block verbatim |
| Background color/atmosphere doesn't match | No background spec in Light block | Add background description to the Light anchor |
| Camera "invents" extra moves | Beat too long, multiple verbs | One verb per Beat |
| Sequence reads as 6 unrelated shots | Headers omitted or roles ignored | Always include `[SHOT N of 6 — ROLE]` and follow the 6-role recipe |
| Macro shot loses material realism | Product block too generic | Specify finish ("matte brushed", "polished", "anodized") and texture |

## Output discipline

- Return **6 separate prompt objects**, one per shot, in order.
- Each prompt object includes the full 6-line structure — never abbreviate Light/Product/Grade to "(see shot 1)".
- Top of the reply: print the CONTINUITY CARD once so the user sees the locked anchors.
- `shotStructure` field: include the full 6-row table (#, Role, Beat, Duration) for the user's editor.
- `modelNotes`: state that Kling 2.1 is silent — point them at the post-production audio plan.

## Few-shot (abbreviated)

**User brief:** "6-shot launch film for the new Tudor Black Bay Pro, dark workbench atmosphere, olive NATO strap, 16:9."

**Continuity card:**
- Light: *Key: 3200K tungsten from frame-left at 45°, hard, motivated by an off-screen workbench lamp. Fill: 5600K daylight bounce from camera-right, soft, 2 stops down. Rim: 6000K kicker from behind-left. Background: matte black wood workbench fading to black.*
- Product: *41mm stainless steel Tudor Black Bay Pro, matte brushed case, glossy black dial, yellow snowflake hour hand, olive green fabric NATO strap, crown at 3 o'clock, sapphire crystal with AR coating.*
- Grade: *Desaturated 75%. Shadows neutral with 5% teal lift at 195°. Highlights neutral. Blacks rich, not crushed. 35mm Kodak Vision3 250D grain, low intensity.*

**Shot 1:**
```
[SHOT 1 of 6 — ESTABLISH | 3s]
Beat: The watch rests centered on the workbench; a thin curl of pipe smoke drifts past the lens.
Frame: Wide, 35mm at f/4, eye level, locked-off static.
Light: <continuity Light, verbatim>
Product: <continuity Product, verbatim>
Grade: <continuity Grade, verbatim>
```

(Shots 2–6 follow the same template with only header + Beat + Frame changing.)
