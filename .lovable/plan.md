## Match character & product sheets to the reference layout (visual only, no text)

Make the auto-generated character / product sheet look like the two reference screenshots: **a large closeup on the left + a multi-angle full view on the right (front, right side, left side, back)**, on a clean white background, with **no text, labels, captions, watermarks, or borders** in the image.

### Problems with the current implementation

1. **Edge function** (`supabase/functions/generate-reference-image/index.ts`, lines 189–192) always prepends `"Character sheet, full body reference. Three views in one image side by side: front view, three-quarter view, and side profile…"` — wrong layout, character-only wording.
2. **Client** (`src/components/director/DirectorChat.tsx`, lines 566–569) sends its own `"Product sheet, three views…"` preamble for products. The edge function then prepends its character-only preamble on top, creating a contradictory prompt for products.
3. Neither prompt forbids on-image text/labels, so the model sometimes burns labels into the output.

### Changes

**1. `supabase/functions/generate-reference-image/index.ts`**
- Accept a new optional payload field `subject_kind?: "character" | "product"` (default `"character"`).
- Replace the `character_sheet` branch prompt with one composition shared by both kinds, only swapping the noun:

  For `character`:
  > Character reference sheet. Left half: a large, left-aligned closeup portrait of the character (head and shoulders, outfit visible, neutral expression). Right half: a full-body multi-angle view of the same character showing four poses in order — front, right side profile, left side profile, and back. All views on a seamless pure white background, even soft studio lighting, no shadows under the feet, no props beyond what the character wears. Absolutely no text, no labels, no captions, no annotations, no watermarks, no borders, no soft gradients, no color swatches. Photorealistic. {basePrompt}

  For `product`:
  > Product / object reference sheet. Left half: a large, left-aligned detailed closeup of the item showing material and texture. Right half: a multi-angle view of the same item showing four angles — front, right side, left side, and back (or top if the item is symmetrical). All views on a seamless pure white background, even soft studio lighting, no hands, no people, no props, no shadows beneath the item. Absolutely no text, no labels, no captions, no annotations, no watermarks, no borders, no soft gradients, no color swatches. Photorealistic. {basePrompt}

- Keep `aspect_ratio` default `1:1` for `character_sheet` (the references are roughly square / 4:3 — 1:1 stays safe; can be overridden by caller).

**2. `src/components/director/DirectorChat.tsx`**
- Drop the duplicated `"Product sheet, three views in one image side by side…"` preamble in `handleSubjectLockChoice` (lines 566–569). Pass **only the user's subject description** as `prompt`, and pass `subject_kind: kind` (`"character"` or `"product"`) through `runImageGeneration` so the edge function builds the layout instruction.
- `sheetPrompt` becomes a simple `"The ${kind} described by the user: ${target.payload.prompt}"`.

**3. `src/lib/director/api.ts`**
- Add `subject_kind?: "character" | "product"` to the `generateReferenceImage` payload type so it's forwarded to the edge function.

**4. `src/components/director/DirectorChat.tsx` (runImageGeneration plumbing)**
- Extend the `payload` type at line 328 with optional `subject_kind?: "character" | "product"`, and forward it when calling `generateReferenceImage` / `generateReferenceImageStream`.

### Out of scope
- No UI changes to `GeneratedImageCard` (header already says "Subject sheet · pinned" / "Character sheet").
- No DB migration.
- No changes to storyboard panel prompts or subject-pinning logic.
- No changes to manual `character_sheet` requests coming from the Director agent — they continue to use the same edge function and will benefit from the new layout (kind defaults to character).
