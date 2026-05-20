## Problem

When the user uploads a character face (or product photo) and the Director generates a **character sheet** / product sheet, the result doesn't match the uploaded reference — it invents a new face/object.

Root cause is in `supabase/functions/generate-reference-image/index.ts`, in the `character_sheet` branch (~line 200-210):

- The function DOES forward `reference_urls` to the image model (so the reference image is attached).
- BUT the `sheetTemplate` prompt never tells the model to **match the attached reference**. It only describes layout ("split composition, left closeup, right multi-angle…") plus the user's text description. The model treats the reference as loose inspiration and invents a new identity.
- Compare with `storyboard_panels` and `single_panel`, which prepend `IDENTITY_LOCK` / `SCENE_LOCK` when a reference is attached. `character_sheet` has no equivalent lock phrase.

## Fix (single file)

**`supabase/functions/generate-reference-image/index.ts`** — in the `character_sheet` branch:

1. When `referenceUrls.length > 0`, prepend an identity-lock clause to `sheetTemplate` that is specific to the sheet use case:
   - **character** subject: "Use the attached reference image as the canonical identity. Every view on this sheet (closeup + 4 angles) must show the EXACT same face, hair, skin tone, age, eye color, facial features, and body proportions as the reference. Do not redesign the character; only re-pose and re-angle the same person. Wardrobe may follow the description below if specified, otherwise keep the outfit from the reference."
   - **product** subject: "Use the attached reference image as the canonical product. Every view on this sheet (closeup + 4 angles) must show the EXACT same object — same shape, materials, colors, branding, proportions, and details as the reference. Do not redesign the product; only re-angle the same item."

2. Keep the existing layout/no-text/photoreal rules and the user's `basePrompt` appended after the lock clause.

3. Leave the no-reference path unchanged (current template, generates from scratch).

No changes to `director-agent`, client, or other modes. Storyboard/single-panel locks already work.

## Verification

- Open the existing Director session, upload a face, ask for a character sheet → all 5 views (closeup + front/right/left/back) match the uploaded face.
- Repeat with a product image (e.g. a bottle) → all angles show the same bottle.
- Sheet without reference still works (falls back to the original template).
