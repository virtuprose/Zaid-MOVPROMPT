## Goal

Let users attach **multiple product angle photos** (and optionally a **spec sheet** image/PDF) to a product in the Brand Kit, so the video model locks the same product across all shots — front, back, side, packaging, etc. The current single "Logo / product image" stays as the hero/primary reference; the new uploads are additional locks.

## How it shows up in the UI

Inside `BrandKitSheet.tsx`, below the existing hero image uploader and above the AI fact sheet:

```text
┌─ Hero image (existing, unchanged) ──────────────┐
│  [ uploaded product photo ]                     │
└─────────────────────────────────────────────────┘

Additional angles (optional, up to 5)
┌───────┬───────┬───────┬───────┬───────┐
│ front │ side  │ back  │ top   │ + add │
│  ✕    │  ✕    │  ✕    │  ✕    │       │
└───────┴───────┴───────┴───────┴───────┘
Tip: more angles = stronger 3D lock across shots.

Product spec sheet (optional)
[ + upload PDF or image ]   helps the AI read exact labels, ingredients, dimensions
```

Each angle thumbnail has a tiny editable label chip (`front` / `back` / `left` / `right` / `top` / `bottom` / `packaging` / free text) and a remove ✕. Reorder via drag is **out of scope** for v1.

## Data model

**New table `product_references`** (one row per extra image, separate from `brand_kits` to keep that row small and avoid jsonb gymnastics):

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `brand_kit_id` | uuid | FK-style ref (kept loose, like other tables) |
| `user_id` | uuid | for RLS |
| `kind` | text | `'angle'` or `'spec_sheet'` |
| `image_path` | text | storage path in `director-uploads` |
| `label` | text nullable | e.g. `front`, `packaging` |
| `position` | smallint default 0 | display order |
| `created_at` | timestamptz default now() |

RLS: standard 4 policies, `auth.uid() = user_id` (mirrors `character_kits`).

Storage: reuse the existing private `director-uploads` bucket; new prefix `brand-references/<user_id>/<uuid>.<ext>`. Signed URLs on read, same pattern as `signLogo`.

No new bucket. No edge function changes required for the upload itself.

## Code changes

1. **Migration** — create `product_references` + RLS policies. Cap enforced in app code, not SQL.

2. **`src/lib/marketing/brandKit.ts`**
   - Extend `BrandKit` type with `references?: ProductReference[]` (loaded alongside the kit).
   - Add `loadReferences(brand_kit_id)`, `addReference(brand_kit_id, file, kind, label)`, `updateReferenceLabel`, `removeReference` to the `useBrandKit` hook.
   - Each reference gets a signed `image_url` on read.

3. **`src/components/marketing/BrandKitSheet.tsx`**
   - New section "Additional angles" with a grid + Add button. Max 5 angles; show count.
   - New section "Product spec sheet" — single optional file (image or PDF). Just stores the file; we won't OCR it in v1.
   - When the kit is brand new (no `id` yet), defer uploads to a local pending list and flush them after the kit is saved (so we have a `brand_kit_id`). Same pattern the hero image already uses.

4. **`src/pages/MarketingStudio.tsx`** (`refSlots` builder around line 326)
   - After pushing the existing brand logo slot, push one slot per angle: `{ slot: "brand-angle", url: ref.image_url, label: ref.label }`.
   - Spec sheet is **not** sent as an image reference (FAL/Seedance expects photos, not docs). Skipped for v1.
   - Cap total references passed to the model at 6 (1 hero + 5 angles) to stay within provider limits.

5. **`src/lib/marketingStudio.ts`** (prompt composer / `referenceSlotsForPrompt`)
   - When >=1 angle ref exists, append a **PRODUCT LOCK** line: "Product identity is fixed across every shot — match shape, label text, colors, materials, and proportions from the reference frames; the additional frames are alternate angles of the same product, not different products."
   - If labels are present, include them in the same line ("Reference 2 = front, Reference 3 = packaging, …") so the writer can request specific angles per shot.

6. **`src/lib/director/api.ts` / `write-ad-scene` edge function**
   - Pass the angle labels through the scene-writing payload so the director can pick "front shot" or "packaging close-up" intentionally per scene. Backwards compatible (optional field).

7. **`BrandsRow.tsx` / picker thumbnails** — no change. Hero image stays the thumbnail.

## Out of scope (v1)

- OCR of the spec-sheet PDF. We store it for the user's own reference, but don't parse it. We can add a `parse-product-sheet` edge function later that calls Gemini vision on each PDF page and merges fields into the fact sheet.
- Drag-to-reorder angles.
- Per-shot manual angle picker in the storyboard UI (the director already picks via labels in the prompt).
- Video references.

## Files touched

- new migration: `product_references` table + RLS
- `src/lib/marketing/brandKit.ts` — types + hook methods
- `src/components/marketing/BrandKitSheet.tsx` — UI sections
- `src/pages/MarketingStudio.tsx` — refSlots builder
- `src/lib/marketingStudio.ts` — PRODUCT LOCK prompt block + label hints
- `src/lib/director/api.ts` and `supabase/functions/write-ad-scene/index.ts` — pass labels through
