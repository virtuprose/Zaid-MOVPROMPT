# Mobile Polish — Full Sweep

A pragmatic, scoped audit + fix pass of the mobile experience across all main routes. No new features, no rewrites — only fixes to layout, spacing, tap targets, overflow, safe-area, and overlay stacking.

## Audit findings (from screenshots at 390×844)

1. **Root `/` shows two overlays stacked at once** — the WelcomePopup *and* the TourOverlay both render on first visit. On a 390px viewport they sit on top of each other and the tour callout is partially hidden behind the popup.
2. **No iOS safe-area handling** — `rg` for `safe-area`, `env(safe-area-inset…)`, `pb-safe` returns zero hits in `src/`. Anything fixed/sticky at the bottom (Composer, ResultsPanel actions, dialogs, bottom CTAs) will sit under the home indicator on iPhone.
3. **TopNav** has the right `hidden sm:*` pattern but the icon-only auth Button on small screens drops the label entirely with no `aria-label` fallback — fails `button-name`.
4. **Tap targets** — many icon-only ghost Buttons use shadcn's `size="icon"` default (36×36) on primary mobile actions; spec is 44×44.
5. **Gallery `/gallery`** rendered as a blank page in the screenshot — needs a console-log check; likely a loader/auth race or missing empty state on mobile.

Beyond these I'll do a route-by-route pass to catch horizontal-scroll, text clipping, and dialog-width issues.

## Scope

Routes audited and fixed at 360 / 390 / 414 px:
- `/` (RootRoute, plus WelcomePopup + Tour)
- `/auth`
- `/director` and `/director/:sessionId` — the main product surface
- `/library`, `/gallery`, `/learn`
- `/landing`, `/models/:slug`
- `/account/*` settings pages
- Shared chrome: `TopNav`, `AnnouncementBanner`, `CommandPalette`, `WalletDrawer`, primary dialogs

## What changes

### 1. Overlay coordination (first visit on `/`)

- In `OnboardingContext` (or wherever WelcomePopup + TourProvider gate visibility), suppress the tour while WelcomePopup is open. Tour starts only after the popup is dismissed/skipped.
- WelcomePopup gets a mobile-first sizing pass: `max-w-[calc(100vw-2rem)]`, vertical scroll inside the dialog if content exceeds viewport, primary CTA fixed at the bottom with safe-area padding.

### 2. Global safe-area support

- Add Tailwind helpers in `tailwind.config.ts`:
  - spacing tokens: `safe-top`, `safe-bottom`, `safe-x` mapped to `env(safe-area-inset-*)`.
- Apply `pb-[env(safe-area-inset-bottom)]` (or the new helper) to:
  - `Composer` sticky footer in `DirectorChat`
  - `ResultsPanel` floating action bar
  - Any `Sheet`/`Dialog` with sticky footer
  - The simulated safe area in `QaMobile` is already there — leave as is, it's the reference.
- Add `viewport-fit=cover` to `index.html` viewport meta so iOS reports real insets.

### 3. Tap targets

- Sweep icon-only Buttons used in primary mobile flows (TopNav menu, composer attach/send, model picker trigger affordances, dialog close, message bubble actions). Apply `min-h-11 min-w-11` per the a11y note.
- Add missing `aria-label` to icon-only Buttons found during the sweep (TopNav sign-in icon variant is the known one).

### 4. Horizontal-scroll & overflow pass

- Add `overflow-x-hidden` to the page-level wrappers that don't already have it.
- For known offenders (long model names, prompt chips, attachment rows): switch from no-wrap rows to `flex flex-wrap gap-2` at `< sm`, or wrap in a horizontally-scrollable strip with `snap-x` + edge fades.
- `SceneBreakdown` element category labels, `ResultsPanel` shot header — verify `min-w-0` + `truncate` is applied to grid/flex children so long text wraps cleanly instead of forcing scroll.

### 5. Dialogs, sheets, popovers on mobile

- Audit all `Dialog`/`Sheet` usages and ensure:
  - `max-w-[calc(100vw-1rem)]` and `max-h-[90dvh]` with internal scroll
  - Footer buttons stack vertically below `sm` (`flex-col sm:flex-row`)
  - `Popover` content uses `collisionPadding` so it doesn't clip at viewport edges
- Convert the heaviest dialogs (`ShareDialog`, `WalletDrawer`, `VideoOptionsDialog`, `ConfirmRightsDialog`) where the desktop dialog feels cramped on mobile → use shadcn `Sheet` (bottom) at `< md`.

### 6. Director page (the main product) specifics

- Composer: stick to bottom with safe-area padding, attachment dropzone full-width and tappable, model picker chip stays visible (don't push it off-screen by the textarea growing).
- Message bubbles: cap `max-w-[85%]` at `< sm` so wide assistant cards don't force horizontal scroll.
- QuickReplies row: horizontal scroll with `snap-x` and edge fade instead of overflowing or wrapping into 4 lines.
- Approval/question cards: full-width on mobile with internal vertical scroll if they contain image grids.

### 7. Landing & marketing

- Hero stack: single column under `md`, headline drops to `text-4xl`, CTAs stack with `w-full`.
- Section paddings collapse from `py-24` to `py-12` under `sm`.
- Brand/character rows scroll horizontally with `snap-x` instead of wrapping.

### 8. Gallery blank-render bug

- Investigate `/gallery` rendering blank at mobile width — check console + the `Gallery.tsx` mount path. If it's a loader state with no spinner, add a `ResultsSkeleton`-style placeholder.

## Verification

After each section's edits, re-screenshot at 360 / 390 / 414 px using `browser--screenshot` and confirm:

- No horizontal scroll on any route.
- WelcomePopup and Tour never overlap.
- Bottom-fixed elements respect a simulated safe-area (use the existing `/qa/mobile` toggle).
- All primary icon-only Buttons clear 44×44.
- `/gallery` renders content (or a skeleton).

## Technical notes

- Files touched (estimated): `tailwind.config.ts`, `index.html`, `src/components/WelcomePopup.tsx`, `src/components/tour/TourProvider.tsx`, `src/components/TopNav.tsx`, `src/components/director/Composer.tsx`, `src/components/director/DirectorChat.tsx`, `src/components/director/QuickReplies.tsx`, `src/components/ResultsPanel.tsx`, `src/components/ShareDialog.tsx`, `src/components/credits/WalletDrawer.tsx`, `src/pages/Landing.tsx`, `src/pages/Gallery.tsx`, plus small sweeps of message/card components.
- Existing test files (`RtlOverflow.test.tsx`, `ResultsAboveBreakdown.test.tsx`, `ModelPicker.test.tsx`) keep guarding regressions — no new test infra.

## Out of scope

- Redesigning any page or component.
- Bottom-tab navigation or any new mobile-only IA.
- PWA install / offline behaviour (already handled elsewhere).
- RTL polish beyond what existing tests cover.
