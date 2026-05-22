# Remove the Gallery entirely

Delete the public prompt gallery so it stops rendering anywhere in the app.

## Heads-up: `/models/:slug` also renders the gallery

`src/pages/ModelLanding.tsx` is a thin wrapper around `GalleryView` from `Gallery.tsx`. Removing the gallery means this model-landing page can no longer render either — the plan removes it too. If you want to keep `/models/:slug` with a different (non-gallery) layout, say so and I'll skip that part.

## Files to delete

- `src/pages/Gallery.tsx`
- `src/pages/ModelLanding.tsx` (depends on `GalleryView`)

## Edits

1. **`src/App.tsx`** — remove the imports and routes:
   - `import Gallery from "./pages/Gallery.tsx";`
   - `import ModelLanding from "./pages/ModelLanding.tsx";`
   - `<Route path="/gallery" ... />`
   - `<Route path="/models/:slug" ... />`

2. **`src/components/CommandPalette.tsx`** — drop the Gallery tab:
   - Remove `"gallery"` from the `Tab` union.
   - Remove the `<TabsTrigger value="gallery">` and the `tab === "gallery"` block.

3. **`src/components/EmptyStateExamples.tsx`** — remove the `to="/gallery"` link (or repoint it to `/director`; default is to remove).

4. **`src/components/ShareDialog.tsx`** — remove the "Submit to public gallery" checkbox UI and the `submitToGallery` state. Calls to `createSharedPrompt` will pass `featured: false` implicitly (omit the flag).

5. **`src/components/onboarding/StepQuickTips.tsx`** — remove the "Public Gallery" tip item.

6. **`src/lib/sharePrompt.ts`** — remove the unused `GalleryItem` type and `fetchGallery()` function.

## Left as-is (not user-visible "gallery section")

- `learn.toc.examples` / `learn.examples.title` translations say "Examples gallery" — this is the Learn page's local examples grid, unrelated to the public Gallery page. Leaving them alone.
- `public/sitemap.xml` and `public/llms.txt` — if they reference `/gallery`, I'll scrub those entries too during implementation.

## Verification

- Build passes (typecheck after deletions).
- `rg -i "from \"@/pages/Gallery\"|/gallery"` in `src/` returns no hits.
