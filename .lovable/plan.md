## Goal

Polish the New / Edit brand modal so it looks intentional and matches the rest of the cinematic UI (right now it reads as raw form fields stacked in a tall scroller).

## Issues in the current screenshot

1. Modal body scrolls together with header & footer — footer drifts away on long forms.
2. Blue browser focus ring on the active "Upload image" toggle clashes with amber accent.
3. Logo upload area: tiny placeholder square + bare "Upload" button + cramped helper text. No drop zone, no visual weight.
4. Toggle pills (Type, Image source) have inconsistent height/padding versus the rest of the form, and the active state uses a harsh solid-amber pill that fights the field labels above it.
5. Field labels are too prominent (uppercase amber-leaning) and inputs are under-styled, so the rhythm feels broken.
6. Footer: ghost "Cancel" sized equal to "Save brand" makes secondary action too heavy; no separator.

## Changes

### Layout
- Convert `DialogContent` into a 3-row flex column: sticky header, scrollable body (`flex-1 overflow-y-auto`), sticky footer with top border.
- Tighten width to `max-w-[520px]`, body padding `px-6 py-5`, footer `px-6 py-4 border-t border-border/60`.

### Header
- Keep title + description, drop the extra top margin, add a thin divider under the header.

### Segmented toggles (Type, Image source)
- Use a single shared `Segmented` component: rounded-lg track `bg-secondary/40 border border-border/60 p-1`, equal-width buttons `h-9`, active state = `bg-accent text-accent-foreground shadow-sm`, inactive = `text-muted-foreground hover:text-foreground`.
- Remove default focus ring; use `focus-visible:ring-1 focus-visible:ring-accent/60`.

### Logo / image picker
- Replace the current 80px square + button row with a single drop-zone card: full-width, dashed border `border-dashed border-border hover:border-accent/60`, height ~140px, centered icon + "Drag & drop or click to upload" + subline "PNG, JPG, WEBP — up to 5 MB".
- When an image exists: show it as a 96px rounded thumbnail on the left, file name + Replace / Remove buttons on the right, no dashed border.
- URL mode: same card height, single Input with leading link icon and a small "Use URL" button on the right; helper text below.

### Field labels & inputs
- Lowercase-styled labels: `text-[11px] font-medium text-muted-foreground` (drop uppercase tracking for body fields, keep uppercase only for the two segmented section labels).
- Inputs/Textarea: `bg-secondary/30 border-border/60 focus-visible:border-accent/60 focus-visible:ring-1 focus-visible:ring-accent/30`.
- Textarea: min-h-[96px], show character counter inline-right under the field when `max` is set.

### AI status chip
- Pill style `inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 text-accent text-[11px]` instead of plain text.

### Footer
- Sticky inside `DialogContent`, with a faint top border.
- Layout: `Delete` (only when editing) on the left as a subtle ghost-destructive link, then `flex-1 spacer`, then `Cancel` (ghost, auto width) and `Save brand` (amber, `min-w-[140px]`) on the right — Save no longer stretches half the footer.

## Out of scope
- No changes to brand state, validation, AI auto-fill behavior, upload logic, or the parent picker.
- No new fields.

## Files

- `src/components/marketing/BrandKitSheet.tsx` — only file touched.
