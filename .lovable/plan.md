

## Build the Prompt Library UI

Add a visible prompt history page so signed-in users can browse, copy, and reuse their saved prompts.

### What We'll Build

A `/library` page accessible from the main nav showing all previously generated prompts in reverse chronological order.

Each history card displays:
- Workflow type badge (Single / Two Frames / Multi-Shot)
- Target model used
- Timestamp (relative, e.g. "2 hours ago")
- Truncated preview of the main prompt
- Expand to see full results (all shots with main prompt, negative prompt, camera, model notes)
- Copy All button per entry

### Navigation
- Add a "Library" link in the main app header (visible only when signed in)
- Use the History icon (already imported on Auth page)

### Technical Details

**New files:**
- `src/pages/Library.tsx` — main page with query to `prompt_history`, cards, expand/collapse, copy
- Route added in `App.tsx`

**Translation keys added:**
- `library.title`, `library.empty`, `library.copyAll`, `library.delete` (EN + AR)

**No database changes needed** — the `prompt_history` table and RLS policies already exist.

### Design
- Dark cinematic theme matching existing app
- Cards with `bg-card border-border` styling
- Workflow type as colored badge
- Expandable results using existing `ResultCard`-style layout
- Empty state with icon + CTA to generate first prompt

