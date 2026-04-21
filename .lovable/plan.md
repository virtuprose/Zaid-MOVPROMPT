

## Mobile UI polish pass

### Scope

Mobile viewport (≤440px) on the main flow: `/` → upload → breakdown → generate. Desktop stays unchanged.

### Issues observed & fixes

**1. Top bar crowding (`src/pages/Index.tsx`)**
On 440px the top bar has 4–5 buttons that wrap or overflow. Fix:
- Collapse the top-right row into a tighter group: reduce gap from `gap-1.5` to `gap-1`, keep icons-only on mobile (already hides labels), but shrink avatar button to `size="icon"` on mobile.
- Ensure the row stays on one line by using `flex-nowrap` and `shrink-0` on each button.
- Reduce top padding on mobile: `py-6` → `py-4`.

**2. Hero sizing (`src/pages/Index.tsx`)**
- Logo feels oversized next to the title on small screens: `w-10 h-10` → `w-9 h-9`, title `text-3xl` → `text-[26px]` on mobile to avoid the two-line wrap some users see at 360px.
- Reduce hero bottom margin `mb-8` → `mb-6` on mobile.
- Subtitle `text-base` → `text-sm` on mobile, tighter `max-w` so it doesn't hit the edges.

**3. Container padding (`src/pages/Index.tsx`)**
`px-4` is fine, but inner cards (`WorkflowPanel`, `ModelPicker`, `ConfigPanel`, `SceneBreakdown`) use `p-6` which eats horizontal space. Drop to `p-4` on mobile via `p-4 sm:p-6` where currently `p-6`.

**4. SceneBreakdown element cards (`src/components/SceneBreakdown.tsx`)**
- Action buttons (Lock/Move) wrap awkwardly under 400px. Make the button row use `flex-wrap` with `gap-1.5` and shrink button labels to icon-only below `sm`.
- Note textarea min-height too tall on mobile — reduce from default to `min-h-[64px]` on mobile.
- Category chip + description currently overflow; add `min-w-0` and `truncate`/`line-clamp-2` to description text.

**5. SceneMentionTextarea (`src/components/SceneMentionTextarea.tsx`)**
- "Insert mention" pill + hint wrap to two lines on mobile; the hint text should drop to one line or hide below `sm`. Keep pill always visible, hide the inline hint on `< sm` (the toast-like muted text).
- Popover width `w-80` (320px) is wider than the 440px viewport minus padding — already ok, but set `w-[min(20rem,calc(100vw-2rem))]` to be safe.

**6. ModelPicker (`src/components/ModelPicker.tsx`)**
- Verify cards on mobile stack cleanly; if grid is 2-col it should become 1-col `< sm`. Adjust to `grid-cols-1 sm:grid-cols-2` where applicable.

**7. ResultsPanel (`src/components/ResultsPanel.tsx`)**
- Copy/regenerate buttons wrap to two rows on mobile; make the header row `flex-wrap gap-2` with buttons `size="sm"` on mobile.
- Collapsible refinement sections have oversized padding — reduce to `p-3 sm:p-4`.

**8. Sticky Generate bar on mobile (`src/components/WorkflowPanel.tsx`)**
Currently the Generate button sits at the bottom of a long scroll; easy to miss. Make it sticky at the bottom of the viewport on mobile only during the `breakdown` phase:
- Wrapper: `sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border/40 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0`.

**9. Ambient glow (`src/pages/Index.tsx`)**
The 800×400px blur circles cause slight horizontal overflow on mobile — ensure the parent has `overflow-hidden` (already set) and shrink the blur to `w-[500px] h-[260px]` on mobile.

**10. Safe-area padding**
Add `pb-[env(safe-area-inset-bottom)]` to the sticky generate bar and page root so iOS home indicator doesn't overlap.

### Files touched

- `src/pages/Index.tsx` — top bar, hero, glow, safe-area.
- `src/components/WorkflowPanel.tsx` — sticky Generate bar, inner padding.
- `src/components/SceneBreakdown.tsx` — element card layout, button wrapping, truncation.
- `src/components/SceneMentionTextarea.tsx` — pill/hint row, popover width.
- `src/components/ModelPicker.tsx` — grid columns + padding.
- `src/components/ResultsPanel.tsx` — header wrap, collapsible padding.
- `src/components/ConfigPanel.tsx` — padding reduction only.

### Out of scope
- Desktop layout, dark theme tokens, copy/i18n, any logic changes (intent detection, generation flow, auth).
- New components or icons.

