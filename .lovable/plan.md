## Goal

When a brand is selected, surface it as an "attachment chip" inside the composer (above the textarea), showing the product/logo thumbnail + name + an X to detach — matching the reference screenshot's chat-style attachment chips. Same treatment for an attached location image so the composer always shows what's being sent.

## Changes — `src/pages/MarketingStudio.tsx` composer card only

### 1. New attachments row above the textarea
Add a small wrapper inside the composer card, before `<Textarea>`. It only renders when `brandKit?.name` or `location.imagePath` exists.

```
[ thumb ] Haribo Goldbears  [×]   [ thumb ] Studio backdrop  [×]
```

Per chip:
- Container: `inline-flex items-center gap-2 pr-2 pl-1 h-8 rounded-lg border border-border/60 bg-secondary/40 text-xs`
- Thumbnail: 24×24 rounded-md, `object-contain` on `bg-white/5`. Falls back to a Building2 / MapPin icon when no image.
- Label: brand name (truncate, max-w ~140px) or location place / "Location image".
- X button: 5×5 ghost icon button → calls `setBrandActive(null)` for brand, or clears `imagePath`/`imageUrl` for location.

### 2. Remove the duplicate brand chip from the bottom pill row
The current passive "Brand: Bose" chip in the filters row (`MarketingStudio.tsx` ~lines 277-289) gets removed — its job moves to the attachments row.

### 3. Subtle tweaks
- If at least one attachment exists, add `pb-2 mb-2 border-b border-border/30` under the attachments row so the textarea visually sits below them.
- Keep BrandsRow above the composer card as-is — the new chip is just a "what's currently attached" indicator.

## Out of scope
- BrandsRow card design (already polished in previous turn).
- BrandKitSheet modal.
- Sending the brand image to the model — selection logic is unchanged; only the visual representation moves.

## Files
- Edit only: `src/pages/MarketingStudio.tsx`

## Tech notes
- Reuse existing `brandKit`, `setBrandActive`, `location`, `setLocation` already in scope.
- Use `lucide-react` `X`, `MapPin` icons (already imported elsewhere in this file).
