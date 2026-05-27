## Goal

Polish `PresetPickerDialog` (used by both "Pick the format that hits" and "Pick the scene") so the header doesn't crowd the dialog's built-in close button, the search field feels intentional, and the left filter rail reads as a clean sidebar. Because both pickers share the component, every fix below applies to both automatically.

## Changes (single file: `src/components/marketing/PresetPickerDialog.tsx`)

### 1. Header — breathing room around search + close (lines 172–203)

- Add right padding on the header container (`pr-14`) so neither title nor search ever sits under the shadcn close X (which is absolute top-right with `right-4`).
- Increase the gap between the title block and search from `gap-6` to `gap-8`.
- Make the search bar a touch wider (`w-72`) and slightly taller (`h-10`) so it doesn't feel pinched, and round it (`rounded-xl` reads cleaner than full pill next to the dialog corner).
- Bump the search clear-X hit area and add `right-2.5` so the icon isn't kissing the input edge.
- Add `border` + subtle focus ring tokens so the search reads as a real input, not a floating pill.

### 2. Left filter rail — sectioning and rhythm (lines 209–304)

- Widen rail from `w-[200px]` to `w-[220px]` and bump padding to `px-5 py-6` so labels and items breathe.
- Increase the gap between "Mode" and "Filter" sections from `gap-5` to `gap-7`.
- Standardize section headers: same uppercase tracking, a thin `mb-2.5` divider line underneath in `border-border/30` so each group is visually anchored.
- Bump button padding to `px-3 py-2` and item spacing from `space-y-0.5` to `space-y-1` for a calmer list rhythm.
- Active filter pill: instead of plain `bg-muted/40`, use a left accent bar (`border-l-2 border-[#F5A524]`) + `bg-muted/30` so the active state is unambiguous and matches the cinematic amber accent the rest of the app uses.

### 3. Footer / commit bar (if present) — verify the same `pr-14` clearance doesn't get clipped, otherwise no change.

### 4. Apply to both pickers automatically

Both `format` and `scene` PresetPickerDialog instances in `src/pages/MarketingStudio.tsx` already render this same component, so no callsite changes are needed — the polish lands in both at once.

## Out of scope

- No structural reshuffling (rail stays left, search stays top-right, grid stays right).
- No changes to the card grid itself (covered in the previous video-only change).
- No new icons, no new copy.