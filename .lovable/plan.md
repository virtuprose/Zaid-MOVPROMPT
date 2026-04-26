## Redesign the Prompt Library

The current Library is a vertical list of dense rows: a small 64×64 thumbnail, a wall of preview text, model badge, and timestamp all squeezed onto one line. On a 1144px-wide viewport it feels cramped and "weird/unorganized" — there's no visual hierarchy and the reference image used at generation isn't featured.

### What I'll change

**Layout — switch from a list to a responsive image-led card grid**
- 1 col (mobile) → 2 col (≥640px) → 3 col (≥1024px), `gap-4`.
- Each card becomes a tile with three clear zones: **media → meta → prompt preview**.

**Card structure (`HistoryCard` in `src/pages/Library.tsx`)**
- **Top: media banner** — `aspect-video` reference image (the first `image_paths[0]`) using the existing signed-URL logic. If multiple images exist, show a small `+N` badge in the corner. Empty-state fallback: gradient surface with a `Film` glyph (matches the dark cinematic theme).
- **Overlay on media**: workflow badge (top-left) + relative time (top-right), both on a subtle `bg-background/60 backdrop-blur-sm` chip so they read against any image.
- **Body (p-4)**:
  - Model name in `text-xs font-mono uppercase tracking-wider text-primary` (e.g. `VEO 3`).
  - 2-line clamped prompt preview (`text-sm leading-relaxed`).
- **Footer** (always visible, separated by border): "View prompts" toggle on the left, copy/delete icon buttons on the right. Removes the awkward "click anywhere on the row" pattern.

**Expanded state**
- Inline expansion stays, but rendered below the card spanning the full grid row width using a separate dialog/sheet on mobile to avoid breaking the grid. Simplest: keep inline expansion within the card but show all reference images as a horizontal strip at the top of the expanded section (already implemented — keep as-is).

**Header polish**
- Add a subtle subtitle under the title: "{count} saved generations" so the page feels populated even with few entries.
- Tighten filter chips spacing; group workflow chips and model chips with a small visual divider so the toolbar reads as two clusters rather than one long line.

**Empty/no-image fallback**
- Cleaner gradient placeholder using `bg-gradient-to-br from-primary/10 via-secondary/40 to-accent/10` with the `Film` icon centered — matches brand, no longer looks "broken".

### Files

- `src/pages/Library.tsx` — restructure `HistoryCard` (media-led layout, footer actions, badges as overlays) and the page grid container (replace `space-y-3` with `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`). Update skeleton to match new card aspect ratio.
- `src/i18n/translations/en.ts` + `src/i18n/translations/ar.ts` — add `library.subtitle` ("{count} saved generations" / Arabic), `library.viewPrompts`, `library.morePhotos` ("+{n}").

### Out of scope
- No DB/schema changes — `image_paths` and the `generation-images` bucket are already used; we just surface them more prominently.
- No changes to how generations are saved (already capturing reference images correctly).

### Verification
1. Navigate to `/library` — cards render in a 2- or 3-column grid depending on viewport.
2. Each card shows the reference image used at generation as a banner (or a clean fallback).
3. Workflow badge and timestamp overlay the image; model + prompt preview sit cleanly below.
4. Clicking "View prompts" expands inline with all shots, copy buttons, and the full reference-image strip.
5. Filter chips and search behave exactly as before.
6. AR locale: layout mirrors, overlay chips stay correctly positioned (logical `start`/`end`).
