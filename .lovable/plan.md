
## Goal
Restyle the **Element upload zone** (Seedance 2.0 / 2.0 Fast) so the empty / add area matches the attached screenshot: a large dashed rounded card with three circular icon badges (image / video / music), a "Upload media" title, and "Image, Video or Audio" subtitle.

## Current state
`ElementGrid.tsx` shows uploaded items in a 3×N grid and the "add more" tile is a tiny dashed square with a `+`. There is no large empty-state CTA.

## Design (from screenshot)
- Empty state: full-width dashed dark card, centered content:
  - Row of 3 circular icon buttons: 🖼 image, 🎥 video, 🎵 music (subtle radial-gradient background, soft border).
  - Title: **Upload media**
  - Subtitle: **Image, Video or Audio**
- Whole card is clickable + drag-and-drop target → opens file picker (accepts image/video/audio, multiple).
- After at least one upload: keep the existing 3-col thumbnail grid (matches screenshot 2). The `+` add-tile stays at the end until 10 reached.

## Changes
**`src/components/ElementGrid.tsx`** (only file touched)
1. Add an **empty-state** branch (`items.length === 0`): render the large dashed card with the 3 circular icons + "Upload media" / "Image, Video or Audio". Hook click + drag-drop to the existing `handleFiles` handler.
2. Keep the existing thumbnail grid for `items.length > 0`, including the small `+` add tile.
3. Add drag-drop support (already file-picker only today) on both the empty state and the `+` tile.
4. Use existing tokens: `border-border`, `bg-secondary/40`, `text-muted-foreground`, primary/accent for icon glow — fits the dark cinematic theme.

## i18n
Add 2 keys to `en.ts` + `ar.ts`:
- `elements.uploadMedia` → "Upload media" / "ارفع وسائط"
- `elements.uploadMediaSubtitle` → "Image, Video or Audio" / "صورة أو فيديو أو صوت"

## Files touched
- `src/components/ElementGrid.tsx`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`

No backend changes, no new dependencies.
