## Goal

Make avatar uploads produce **consistent** characters across shots without forcing the user to fill a long form. Tell the model exactly what the photo means (face-only vs full look) and auto-extract the visible details so the user just reviews them.

## What changes for the user

In the existing **Character Kit** sheet, above the upload box, add a **shot type** toggle:

```
What does this photo show?
( ● ) Face / headshot      ( ○ ) Full look (head-to-toe + outfit)
```

After they upload:
1. A small "Analyzing photo…" spinner runs (~2s).
2. The **Description** field is auto-filled — e.g. *"Mid-20s woman, athletic build, shoulder-length brown hair, warm tan skin, white tee, light denim jacket, gold hoop earrings."*
3. User reviews/edits, hits Save. Nothing forced.

That's the entire UX change. No new form fields, no questionnaire.

## How shot type changes the generated video

| Shot type | What the prompt locks |
|---|---|
| **Face / headshot** | Face matches reference photo. Body/wardrobe come from the Description text (or stay "natural, consistent across shots" if blank). Lets the user reuse one face with different outfits per ad. |
| **Full look** | Face + build + wardrobe + accessories all locked from the reference. Used as-is across every shot. Best for brand mascots, founders, fashion. |

This is enforced in the **CHARACTER LOCK** block of `composeStudioPrompt` and in the `write-ad-scene` system prompt.

## Technical details

### 1. DB migration — add `shot_type` to `character_kits`
```sql
ALTER TABLE public.character_kits
  ADD COLUMN shot_type text NOT NULL DEFAULT 'face';
-- allowed values enforced in app: 'face' | 'full'
```
No RLS changes (existing policies cover it).

### 2. New edge function: `describe-character`
- Input: `{ image_url: string, shot_type: 'face' | 'full' }`
- Calls **Lovable AI** with `google/gemini-3.1-pro-preview` (vision).
- System prompt asks for a single 1–2 sentence physical description optimized for video-prompt continuity. For `shot_type='face'` it focuses on face/hair/skin/age; for `'full'` it adds build, wardrobe, footwear, accessories.
- Returns `{ description: string }`.
- `verify_jwt = true` (uses caller's session), CORS enabled, Zod validation.

### 3. Wire into `CharacterKitSheet.tsx`
- Add `shot_type` to draft state + radio toggle UI above the upload area.
- In the existing `uploadReference` flow: after upload succeeds, set a `describing` flag, call `describe-character` with the new `reference_url`, and `update("description", result.description)`. Show the existing "Analyzing photo…" spinner area (it's already partially scaffolded with the "Filled by AI" hint at line 243).
- Don't overwrite a description the user already typed — only auto-fill when the field is empty.

### 4. Update `useCharacterKit` hook
- Include `shot_type` in the row shape, save path, and the `CharacterContext` returned to the studio.

### 5. Prompt composition (`src/lib/marketingStudio.ts`)
- Extend `CharacterContext` with `shot_type`.
- In the CHARACTER LOCK block (around line 702):
  - `shot_type='face'` → `"Face matches reference image. Wardrobe and styling: {description or 'natural, consistent across all shots'}."`
  - `shot_type='full'` → `"Face, build, wardrobe, and accessories all match reference image exactly. Keep identical across every shot."`

### 6. Edge function `write-ad-scene`
- Add `shot_type` to each character in the payload.
- Update the system prompt's character section to mirror the same two-mode behavior so the auto-written describe-box stays aligned with the final lock.

## Out of scope (deliberately deferred)
- Multi-photo references per character (face + outfit separately)
- Per-shot wardrobe changes inside one storyboard
- Body-shape / vibe chips — the auto-extracted description already covers this in natural language

## Files touched
- `supabase/migrations/<new>.sql` — add `shot_type` column
- `supabase/functions/describe-character/index.ts` — new
- `supabase/functions/write-ad-scene/index.ts` — pass through `shot_type`
- `src/lib/marketing/characterKit.ts` — extend hook
- `src/components/marketing/CharacterKitSheet.tsx` — toggle + auto-describe call
- `src/lib/marketingStudio.ts` — CHARACTER LOCK logic
- `src/lib/director/api.ts` — type for `shot_type`
