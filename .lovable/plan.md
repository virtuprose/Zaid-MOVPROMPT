## Redesign: Director Right Rail → "Luminous Focus"

Restyle the `/director` right rail to match the selected prototype. Composition, hierarchy, and motion register copied verbatim; data sources, props, and behavior unchanged.

### Files to edit

- `src/components/director/RightRail.tsx` — wrap rail in one rounded card with header pulse-dot, body sections, and footer stat bar. Drop the per-section card chrome (`RailSection`) inside the rail; rail becomes a single surface with subtle section labels.
- `src/components/director/rail/QuickActionsCard.tsx` — 2-col grid of vertical icon tiles (icon chip on top, label below). Cyan-tinted chip for primary actions, amber-tinted chip for export.
- `src/components/director/rail/StoryboardOutlineCard.tsx` — convert grid to vertical timeline: left rail gradient line, numbered circular nodes (cyan filled = active, ghost = pending, amber-ringed = attention/failed), right-side panel with title + status meta.
- `src/components/director/rail/ReferenceTrayCard.tsx` — feature the first asset as a hero 16:9 card with stacked "shadow card" behind it, gradient overlay, label + sublabel bottom-left, small action chip top-right. Filter chips (All/Uploaded/Generated) move above the hero card as compact pills.
- `src/components/director/rail/RailSection.tsx` — simplify to a flat label row (small color bar + uppercase title + chevron), no border/card; outer rail provides the container.
- `src/index.css` — add `.custom-scrollbar` (4px, transparent track, cyan/10 thumb on hover) and a soft cyan shadow utility for the rail container.

### Locked tokens (from selected direction)

- Surface: `bg-[hsl(var(--background))]` (#0a0a0f), card surface `#141420`, border `border-white/5`.
- Accents: cyan `hsl(190 90% 50%)` (primary) for active/live, amber `hsl(35 90% 55%)` for attention/export.
- Typography: keep project's `font-display` (Space Grotesk) for headings — visually equivalent to Sora and avoids introducing a new font family. Body stays Inter.
- Radii: rail `rounded-2xl`, inner cards `rounded-xl`.
- Motion: 2s `animate-pulse` dot in header; 150ms color transitions on hover; no layout animation.

### Footer stat bar

Replaces the removed Session Health card. Pulls live values already in scope: scene count (from derived `panels.length`), runtime placeholder (sum of estimated shot durations if available, else hide), and a "Live" pill bound to session presence.

### Out of scope

- No changes to data fetching (`useSessionMessages`), quick-action event dispatch, or storyboard panel derivation.
- Mobile Sheet variant inherits the new `RailContent` automatically; no separate work.
- Other pages and the cinematic hero are untouched.
