## Goal
Audit and fix mobile responsiveness at 375px (iPhone 14) across every major screen.

## Approach
1. Switch preview to mobile, then navigate screen-by-screen capturing screenshots and noting issues.
2. Group fixes by file and apply them in batches.
3. Re-verify each fixed screen at 375px.

## Screens to audit
| # | Screen | Route | Files likely touched |
|---|---|---|---|
| 1 | Tool / Studio | `/` (signed in) | `WorkflowPanel.tsx`, `ImageUploadZone.tsx`, `Index.tsx` |
| 2 | Landing | `/` (signed out) | `Landing.tsx` |
| 3 | Gallery | `/gallery` | `Gallery.tsx` |
| 4 | Library | `/library` | `Library.tsx` |
| 5 | Generated output | `/` after generate | `WorkflowPanel.tsx`, `ResultsPanel.tsx`, `SceneBreakdown.tsx` |
| 6 | Navigation | global | `Index.tsx`, `Landing.tsx` |
| 7 | Scene Elements panel | breakdown phase | `SceneBreakdown.tsx`, `ElementGrid.tsx` |

## Specific fixes mapped to spec
1. **Tool screen** — confirm upload zone uses `w-full` with parent `px-3` (24px total padding). Adjust container if not.
2. **Workflow toggle pills** — already `flex flex-nowrap snap-x` per earlier work; verify no wrap, add `overflow-x-auto scrollbar-none -mx-4 px-4` for momentum on iOS.
3. **Model picker card** — wrap in `w-full` and reduce internal padding to `p-3 sm:p-4` on mobile.
4. **CTAs sticky on scroll** — wrap primary CTA row in a `sm:static fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3` block on mobile only, with safe-area padding.
5. **Landing page**
   - Hero `text-[40px] sm:text-6xl` (or current `text-7xl` shrunk to `text-[40px]` at base).
   - Workflow card grid `grid-cols-1 md:grid-cols-3`.
   - Before/after section flex column on mobile.
   - Testimonials `grid-cols-1 md:grid-cols-3`.
   - Footer `text-center` single column on mobile.
6. **Gallery**
   - Cards `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
   - Search + filter stack vertically (`flex-col sm:flex-row`).
   - Sort dropdown moved below filter row on mobile.
   - All buttons enforce `min-h-[44px]`.
7. **Library**
   - Card grid `grid-cols-1 sm:grid-cols-2`.
   - Filter pills row gets `overflow-x-auto whitespace-nowrap -mx-4 px-4`.
   - Action buttons remain visible inside card footer (already inline).
8. **Generated output (mobile)**
   - Hide left image preview column at `<sm` (`hidden sm:block`).
   - Output card `w-full`.
   - Sticky bottom action bar with Copy / Regenerate / Edit (3 equal-width buttons inside `fixed bottom-0` container, mobile only).
9. **Navigation**
   - Already has hamburger Sheet; verify Studio link is included and menu shows: Studio, Gallery, Pricing (if route exists), Library, Profile, Sign out. Add missing items.
10. **Scene Elements panel**
    - On mobile, stack image preview above elements list (currently side-by-side?). Set `flex-col sm:flex-row`.
    - Element rows: Lock/Move buttons inline with name (`flex items-center gap-2` on the title row, not pushed right).
    - Quick set chips: `overflow-x-auto whitespace-nowrap` row.

## Verification matrix
After implementation, screenshot each route at 375×812 and confirm:
- No horizontal scroll on `<body>`.
- Tap targets ≥44px on all primary buttons.
- Sticky CTA only appears on mobile, never overlaps content.

## Scope notes
- Strictly UI/Tailwind class adjustments — no business logic changes.
- No new components except possibly a small `MobileStickyCta` wrapper if reused.
- Existing translation keys preserved.
- Not adding a Pricing route if it doesn't exist; the spec lists it but only include nav links for routes that exist.
