## Auto-fill brand kit from uploaded logo/product image

When a user uploads an image in the **Your brand** sheet, run it through Lovable AI vision and auto-populate **Name**, **One-line description**, and **Tagline**. User can still edit any field before saving.

### UX

1. User picks "Upload image" mode and selects a file in `BrandKitSheet`.
2. Image uploads to storage as today.
3. Immediately after upload succeeds, an inline status appears under the image: `✨ Reading your brand…` (small spinner, amber).
4. When the AI returns:
   - Empty fields are filled in.
   - Already-filled fields are left untouched (no overwrite).
   - A subtle "Filled by AI — edit anything" hint shows for ~4s.
5. On error: silent toast `Couldn't auto-read the image — fill it in manually`. Upload still succeeds.
6. URL mode (paste image link) gets the same treatment when the URL is a valid image.

### Backend — new edge function `analyze-brand-image`

- Input: `{ imagePath?: string, imageUrl?: string, subject: "product" | "app" }`
- Resolves a signed URL from `director-uploads` if `imagePath` given.
- Calls Lovable AI Gateway with `google/gemini-3-flash-preview` (vision) using AI SDK structured output (`Output.object` + zod):
  ```
  { name: string, description: string (≤120), tagline: string (≤60) }
  ```
- System prompt tuned per `subject` ("This is a product photo / app screenshot. Infer the brand…"). Returns `null` for any field it can't confidently guess.
- Auth required; uses `LOVABLE_API_KEY` server-side.

### Frontend wiring

- `src/lib/marketing/brandKit.ts`: add `analyzeBrandImage({ imagePath?, imageUrl?, subject })` helper that invokes the edge function.
- `src/components/marketing/BrandKitSheet.tsx`:
  - Add `analyzing` state + inline status row under the image area.
  - After `handleFile` succeeds, call `analyzeBrandImage({ imagePath: path, subject: draft.subject })` and merge results into empty fields only.
  - In URL mode, debounce 600ms after URL change; if it looks like an image URL, call `analyzeBrandImage({ imageUrl, subject })`.

### Files

- new: `supabase/functions/analyze-brand-image/index.ts`
- edit: `src/lib/marketing/brandKit.ts` (add helper)
- edit: `src/components/marketing/BrandKitSheet.tsx` (status UI + auto-fill)

### Out of scope

- No DB changes.
- Doesn't touch Format/Hook/Setting/Location.
- Doesn't overwrite anything the user already typed.
