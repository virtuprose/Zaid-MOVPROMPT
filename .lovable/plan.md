

# UI Design Polish for Desktop, Tablet, and Mobile

## Issues Identified

### Auth Page (`/auth`)
1. **Desktop**: Layout is functional but the right-side form card feels disconnected — no vertical centering alignment between left and right, and the "Back to app" link is odd since auth is required
2. **Mobile**: Feature cards take up too much space before the form — user has to scroll far to reach sign-in
3. **Form card**: No rounded corners visible, input fields lack focus glow, Sign In button blends into the card

### Index Page (`/`)
1. **Desktop**: Max-width 4xl is a bit narrow for wider screens; top bar alignment feels sparse
2. **Mobile**: Workflow tab labels are cramped at small sizes; guide steps stack well but could use tighter spacing
3. **General**: No logo mark/icon, just text — could add a subtle camera/film icon

### Admin Login (`/admin/login`)
1. Clean and minimal — minor polish: add ambient glow background to match app theme

### NotFound (`/404`)
1. Uses `bg-muted` which clashes with the dark cinematic theme — should use `bg-background`

### Analytics (`/admin`)
1. **Mobile**: 2-column stat cards grid may be too tight on small phones
2. Chart containers need `min-h` to avoid collapse on mobile

### General Polish
1. Remove `src/App.css` — it has unused Vite boilerplate styles that could interfere
2. Input fields across the app could use a subtle focus ring glow (primary color)
3. Buttons could benefit from subtle hover scale transitions

## Plan

### 1. Polish Auth Page
- On mobile, hide the feature cards and show only the brand + form to reduce scroll
- Center the form better vertically on desktop
- Remove "Back to app" link (auth is required, so there's no "back")
- Add subtle glow/ring to input focus states
- Add brand logo/icon above the form on mobile

### 2. Polish Index Page
- Tighten spacing on mobile for guide steps
- Make workflow tab labels more readable on small screens (abbreviate or use icon-only on tiny screens)
- Add subtle hover scale to the generate button
- Ensure avatar dropdown works well on mobile

### 3. Polish Admin Login
- Add ambient glow background matching the main theme
- Improve input focus styles

### 4. Fix NotFound Page
- Change `bg-muted` to `bg-background` to match dark theme
- Add ambient glow and proper styling

### 5. Clean Up App.css
- Remove unused Vite boilerplate CSS

### 6. Global Input/Button Polish
- Add consistent focus-visible ring styles using primary color glow
- Add `transition-transform hover:scale-[1.02]` to primary action buttons

## Files Changed
- `src/pages/Auth.tsx` — responsive layout improvements, hide features on mobile
- `src/pages/Index.tsx` — spacing and typography polish
- `src/pages/AdminLogin.tsx` — ambient glow background
- `src/pages/NotFound.tsx` — dark theme fix
- `src/pages/Analytics.tsx` — mobile grid adjustments
- `src/App.css` — delete or empty out
- `src/index.css` — add global focus/hover polish utilities

