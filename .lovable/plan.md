## Goal

Replace the current top bar everywhere with a Higgsfield-style horizontal nav: logo on the left, route links in the middle, and a right cluster with Search (⌘K), Buy Credits, Assets, Notifications, and a ringed avatar.

## Visual reference

Dark bar, no card chrome. Logo mark + small divider, then nav links (active link uses cyan with a small leading sparkle). Pill search with ⌘K shortcut. Outlined "Buy Credits" pill with a record-dot. Green-tinted "Assets" pill with a folder glyph. Avatar with an amber gradient ring and a small badge dot.

## Implementation

### 1. New shared component: `src/components/TopNav.tsx`

- Sticky top bar (`sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/40`).
- Left: `logo-mark.svg` + "MovPrompt" wordmark, vertical divider.
- Center nav links (mapped to existing routes):
  - Studio → `/`
  - AI Director → `/director` (amber `New` pill badge)
  - Library → `/library`
  - Learn → `/learn`
  - Gallery → `/gallery`
  - Active link: `text-primary` with a leading 2-dot sparkle glyph.
- Right cluster (in order):
  - Search pill: read-only input styled like the reference, opens nothing yet but shows a `⌘K` kbd chip on the right. (Hook can be wired later.)
  - Buy Credits: outlined pill, red record-dot, navigates to `/account/billing`.
  - Assets: green-tinted pill with folder icon, navigates to `/library`.
  - `NotificationBell` (existing).
  - `LanguageToggle` (existing, condensed).
  - Avatar wrapped in a 2px amber→primary gradient ring with a tiny amber dot badge; opens the existing profile `DropdownMenu` (reuse the menu already built in `Index.tsx`, extracted into the component).
- Mobile (`< sm`): collapses to logo + hamburger `Sheet` with the same links and right-cluster items stacked.

### 2. Extract profile dropdown

Move the existing dropdown JSX from `src/pages/Index.tsx` into `TopNav.tsx` so every page gets the same menu. Keep current items, tour state, and sign-out behavior unchanged.

### 3. Wire it up across pages

Add `<TopNav />` at the top of each page that currently renders its own header:
- `src/pages/Index.tsx` (remove old top-bar JSX, keep `AnnouncementBanner`).
- `src/pages/Director.tsx`, `src/pages/Library.tsx`, `src/pages/Learn.tsx`, `src/pages/Gallery.tsx`, `src/pages/Referrals.tsx`, `src/pages/account/*`.
- Skip `Auth`, `Landing`, `SharedPrompt`, `NotFound`, admin and onboarding routes.

### 4. Tokens

Use semantic tokens only — `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` (cyan), `text-accent` (amber), `bg-accent/10`, etc. The green Assets pill uses an inline HSL accent (`hsl(150 60% 45%)`) wrapped in a tiny utility class added to `index.css` so it stays themable.

## Out of scope

- Wiring the search to a real command palette.
- Real billing flow behind Buy Credits (links to existing billing page).
- Visual restyling of pages below the nav.

## Files

- new: `src/components/TopNav.tsx`
- edit: `src/pages/Index.tsx`, `src/pages/Director.tsx`, `src/pages/Library.tsx`, `src/pages/Learn.tsx`, `src/pages/Gallery.tsx`, `src/pages/Referrals.tsx`, `src/pages/account/AccountSettings.tsx`, `src/pages/account/AccountBilling.tsx`, `src/pages/account/AccountPreferences.tsx`
- edit: `src/index.css` (one helper class for the green Assets pill)
