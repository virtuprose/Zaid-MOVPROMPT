## Move AI Director out of the profile dropdown

Right now "AI Director" lives inside the avatar dropdown (desktop) and the hamburger sheet (mobile) on `src/pages/Index.tsx`. We'll promote it to a first-class entry in the top navigation so users see it without opening a menu.

### Changes (single file: `src/pages/Index.tsx`)

1. **Desktop top nav** — add a new "AI Director" button next to the existing Library button (lines 84–95 area):
   - Same `variant="ghost"`, `size="sm"` styling as Library so it sits inline.
   - `Clapperboard` icon + label "AI Director".
   - Small `New` accent badge (reuse the same `text-accent` "NEW" chip styling currently in the dropdown).
   - Visible on `sm:` and up; hidden on mobile (mobile keeps it in the sheet).
   - Navigates to `/director`, gated to signed-in users (only render when `user` exists, like Library).

2. **Desktop dropdown** — remove the AI Director `DropdownMenuItem` (lines 115–118) since it's now in the nav.

3. **Mobile hamburger sheet** — keep the AI Director entry where it is (lines 163–166). Mobile has limited horizontal space; the sheet is the right place for it. Optionally bump it to the top of the list so it gets visual priority.

### Out of scope

- No changes to `/director` page itself, routes, or auth guard.
- No changes to Landing page CTAs.
- No copy/i18n key changes (label stays plain "AI Director" as it is today).
