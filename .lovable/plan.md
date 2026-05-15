## Add "Buy Credits" button to TopNav (Director only)

Place a new pill button between the Search input and the green Assets button in `src/components/TopNav.tsx`. Only render it when the current route starts with `/director`.

### Changes

**`src/components/TopNav.tsx`**
- Import `useLocation` from `react-router-dom` and the `Coins` icon from `lucide-react`.
- Compute `const onDirector = useLocation().pathname.startsWith("/director");`
- Between the Search `<button>` (line 119) and the Assets `<Button>` (line 124), add:
  - Visible only when `onDirector && !loading && user`
  - Same shape as Assets (`h-9 rounded-full px-3 gap-1.5 text-[13px]`), but using the project's accent (amber) tokens to differentiate: `bg-accent/10 text-accent border border-accent/30 hover:bg-accent/15`
  - Icon: `Coins` (3.5×3.5), label: "Buy Credits"
  - `onClick` navigates to `/account/billing` (matches the existing Buy Credits dropdown destination pattern)
  - `hidden sm:inline-flex` so mobile keeps the avatar/menu pattern

### Out of scope
- No changes to the Director page header itself.
- No changes to the dropdown's existing "Buy Credits" entry.
- No payments wiring — this only routes to billing, matching current behavior.