## Punch up preset card descriptions

The preset cards (Formats + Settings in `src/lib/marketingStudio.ts`) currently use descriptive sentences like "FPV-velocity 4–6 sequence commercial ending in a sudden stop hero reveal" or "Phone-shot, talking-to-camera selfie". They read like documentation, not card copy.

### Goal

Rewrite every preset `description` to a short, catchy 2–4 word tagline that fits a card and sells the vibe at a glance. Keep all `label`, `id`, `prompt`, `fragment`, `image`, `video` fields untouched — only the `description` strings change.

### Style rules

- 2–4 words, ~30 chars max
- Punchy, evocative, verb- or noun-led
- Title Case or sentence fragments — no ending period
- Match the energy of the preset (cinematic, kinetic, intimate, etc.)
- No jargon ("FPV", "Sony Venice", "Steadicam") — speak to the user, not the DP

### Examples

| Old | New |
|---|---|
| "Phone-shot, talking-to-camera selfie" | "Raw & Real" |
| "Step-by-step product walkthrough" | "Show, Don't Tell" |
| "Top-down hands-on reveal" | "Hands-On Reveal" |
| "Customer talking head, candid" | "Real Voices" |
| "Real-time reaction to a reveal" | "Caught On Camera" |
| "First-person point-of-view" | "Through Their Eyes" |
| "FPV-velocity 4–6 sequence commercial ending in a sudden stop hero reveal" | "Full Throttle Reveal" |
| "4-sequence high-budget commercial: texture, kinetic ingredients, fluid splash, reveal" | "Kinetic Hype Drop" |
| "Handcrafted claymation/papercraft diorama, 4–6 sequences ending in a reveal" | "Handcrafted Magic" |
| "Single dramatic product reveal" | "The Big Reveal" |
| "Product woven into daily life" | "Everyday Magic" |
| "6-sequence luxury fashion lifestyle: fantasy world, elite community, lifestyle hero" | "Fashion Fantasy" |
| "6-sequence narrative-driven cinematic fashion film…" | "Editorial Cinema" |
| "Side-by-side transformation" | "Then vs. Now" |
| "Vlog-style routine featuring the product" | "A Day With It" |

### Scope

- All 54 preset entries in `FORMATS`, `SETTINGS`, and any other preset arrays inside `src/lib/marketingStudio.ts`.
- One file, surgical edits.

### Out of scope

- No UI/card layout changes.
- No prompt-engineering or behavior changes — the AI-facing `prompt`/`fragment` text stays exactly as-is.
- No new fields like `tagline`; we reuse the existing `description` slot.
