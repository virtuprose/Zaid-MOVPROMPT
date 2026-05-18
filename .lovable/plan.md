# Consistency hardening for Director image generation

Lock character identity across all 9 storyboard panels by changing how the Director calls the existing `generate-reference-image` function. No new surfaces, no schema changes.

## Changes

### 1. `supabase/functions/generate-reference-image/index.ts`

- **One-at-a-time panel loop**: already sequential — keep, but on each panel call, always re-send `reference_urls` (character sheet) so identity is anchored per shot, not just on the first.
- **Identity lock injection**: when `mode === "storyboard_panels"` and `reference_urls` includes a character image, prepend a fixed lock phrase to every per-shot prompt:
  > `Same character as the attached reference. Maintain exact face, hair, skin tone, age, body proportions, and outfit. Do not redesign the character. Shot N of N: <beat>`
- **3-view character sheet**: keep current single-image character_sheet output, but harden the prompt to explicitly request three views in one image (front, 3/4, side), neutral expression, flat studio backdrop, even lighting — this is what the panel calls then reference.
- **Per-panel regenerate**: accept an optional `shot_index` + single `per_shot_prompts: [string]` so the client can re-roll exactly one cell without touching the other 8.

### 2. `supabase/functions/director-agent/index.ts`

System prompt updates in the `IMAGE GENERATION` section:
- Always pass the character sheet URL in `reference_urls` on **every** `storyboard_panels` call, even regenerations.
- Echo the locked visual spec (style, lighting, color grade) verbatim into every per-shot prompt, after the identity lock line.
- When the user asks "redo panel 4", call the tool with `mode: "storyboard_panels"`, `per_shot_prompts: [<new beat>]`, `shot_index: 4`, and the same character reference.

### 3. `src/components/director/GeneratedImageCard.tsx`

- Add a small **Regenerate** button overlay on each panel cell (storyboard grid) and on the character sheet thumbnail.
- Add a **Regenerate all** button under the grid.
- Buttons dispatch a chat message back to the Director (e.g. "Regenerate panel 4 — make the lighting warmer") rather than calling the edge function directly, so the Director stays in control of the prompt + reference wiring.

### 4. `src/components/director/DirectorChat.tsx`

- Handle the new regenerate intents: forward the user's note + the original panel beat + the character ref back into the Director turn.

## Out of scope

- No new pages, no Composer image button, no standalone image library.
- No model swap — staying on `google/gemini-3.1-flash-image-preview`.
- No masking / inpainting.

## Acceptance

- Generating 9 panels passes the character reference on all 9 calls (verifiable in edge logs).
- Every panel prompt contains the identity lock line.
- Clicking Regenerate on panel 4 re-rolls only panel 4, keeps the other 8, and still passes the character ref.
- Character sheet output shows 3 views in one image.

## Files touched

- `supabase/functions/generate-reference-image/index.ts`
- `supabase/functions/director-agent/index.ts`
- `src/components/director/GeneratedImageCard.tsx`
- `src/components/director/DirectorChat.tsx`
