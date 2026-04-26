## Problem

In the current Prompt Library, each card lives in a 3-column grid cell. When you click **View prompts**, only that single cell grows taller — its sibling cards in the same row stay short, so the long expanded prompt sits inside a narrow column with large empty gaps on its left and right (visible in your screenshot).

## Solution: Inline full-width "details drawer"

Instead of expanding the prompt *inside* the card's narrow column, expand it as a **full-width panel docked underneath the card's row** — spanning all 3 columns. This is the pattern used by the iOS App Store, macOS Finder gallery view, and Pinterest. The card stays compact in the grid; the prompt content gets the full library width to breathe.

### Visual behavior

- **Closed state** → unchanged: compact card in the grid.
- **Click "View prompts"** → the card stays where it is; a wide panel slides open directly under that row, spanning the full grid width (`col-span-full`). It contains the reference images strip + all shot prompts, laid out in a comfortable 2-column reading width on desktop.
- **Click again / click another card** → the panel collapses (or swaps to the new card's content). Only one card can be expanded at a time, which keeps the grid tidy.
- A small **arrow tick** above the panel points back at the card it belongs to (subtle visual link, like the App Store).

### Technical changes (`src/pages/Library.tsx`)

1. **Lift expansion state to the parent `Library` component**: replace the per-card `useState(expanded)` with a single `expandedId: string | null` at the page level. Pass `isExpanded` and `onToggle` props into `HistoryCard`.
2. **Group cards into rows** based on the responsive column count (1 / 2 / 3 cols at `sm` / `lg`). Use a CSS-only approach: render all cards into the existing grid, and when a card is expanded, insert a `<div className="col-span-full">` sibling **immediately after the last card of that card's row**. The row index is computed from the card's position and the active breakpoint (tracked via a small `useMediaQuery` or `matchMedia` listener — already a pattern in `use-mobile.tsx`).
3. **Build a new `<ExpandedPromptPanel>` component** containing exactly the content currently inside the `<AnimatePresence>` block (lines 187–250): reference-images strip + per-shot main / negative / camera / notes blocks with copy buttons. Render it inside a `Card` with:
   - `col-span-full` so it spans all columns
   - `max-w-4xl mx-auto` inner wrapper so the prose stays readable instead of stretching edge-to-edge
   - On `lg`, lay out the shot prompts in a 2-column grid (`lg:grid-cols-2 gap-4`) so long multi-shot results read like a magazine spread instead of one tall column
   - A small CSS triangle (`::before` or absolutely positioned `<div>` with `rotate-45`) pointing up at the source card, horizontally aligned with the card's column
   - A close (`X`) button in the panel's top-right
4. **Remove the in-card `<AnimatePresence>` expansion block** (lines 187–250) — that content now lives only in the full-width panel.
5. **Animate the panel** with framer-motion `height: 0 → auto` + `opacity` (same transition timing as today, 0.25s) so it feels like the same drawer, just wider.
6. **Scroll-into-view**: when a panel opens, smoothly scroll it into the viewport (`scrollIntoView({ behavior: "smooth", block: "nearest" })`) so users on long pages don't have to hunt for it.
7. **Mobile (1-column grid)**: behavior is identical to today — the panel sits directly under its card and naturally fills the column. No empty side gaps exist there, so nothing visually changes for mobile users.
8. **RTL-safe**: use logical properties (`start-*` / `end-*`) for the arrow tick and close button so Arabic layout mirrors correctly.

### Files to modify

- `src/pages/Library.tsx` — lift state, add row-grouping logic, extract `ExpandedPromptPanel`, restructure grid render.

### What you'll see after this fix

- Click "View prompts" → the card stays compact in its column; a wide, well-spaced panel appears below the entire row with the prompt centered in a comfortable reading width.
- No more empty bands on the left/right of long prompts.
- Multi-shot prompts read in a 2-column layout on desktop instead of one extremely tall narrow column.
- Other cards in the row stay neat and aligned instead of being stretched.
