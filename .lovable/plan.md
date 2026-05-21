## Goal
Add a light/dark theme toggle, surfaced in the signed-in account dropdown (and mirrored in Account → Preferences). Default stays dark.

## Implementation

**1. Theme provider** — `src/components/ThemeProvider.tsx` (new)
- Lightweight context: `theme: "dark" | "light"`, `setTheme`, `toggleTheme`.
- Persists to `localStorage("movprompt-theme")`, defaults to `"dark"`.
- Toggles `class="light"` on `<html>` (we keep dark as the base `:root`, light as override — no FOUC since default matches base).
- Mount once in `src/main.tsx` (or `App.tsx`) around the router.

**2. Light tokens** — `src/index.css`
Add a `.light` block after `:root` overriding the semantic tokens only (background, foreground, card, popover, muted, secondary, border, input, sidebar-*). Keep `--primary`/`--accent` amber and `--brand` cyan as-is so brand identity survives. Light values (HSL):
- background `0 0% 100%`, foreground `240 10% 8%`
- card `0 0% 100%`, popover `0 0% 100%`
- muted `240 5% 96%`, muted-foreground `240 5% 40%`
- secondary `240 5% 94%`, border/input `240 6% 88%`
- sidebar parallels above

**3. Account dropdown item** — `src/components/TopNav.tsx`
Add a `DropdownMenuItem` (Sun/Moon icon) above the existing separator near Preferences. Label: "Light mode" / "Dark mode". Clicking calls `toggleTheme()` without closing flow.

**4. Preferences page card** — `src/pages/account/AccountPreferences.tsx`
Add a third `Card` ("Appearance") with a small segmented control (Dark / Light) bound to the same context.

**5. Known scope limit (documented, not redesigned)**
The cinematic landing hero (`CinematicHero.tsx` and its rotating column) uses a dark video background with hard-coded `#1a0a08`-style classes. It will keep its dark look in both modes — this matches the user request (toggle lives in the account dropdown, which only exists after sign-in, so the marketing hero is rarely viewed in "light mode"). All token-driven surfaces (Docs, Library, Director, Account, modals, dropdowns, nav) flip correctly.

## Files
- new: `src/components/ThemeProvider.tsx`
- edit: `src/index.css` (add `.light` token block)
- edit: `src/main.tsx` (wrap with `<ThemeProvider>`)
- edit: `src/components/TopNav.tsx` (dropdown item + icon import + `useTheme`)
- edit: `src/pages/account/AccountPreferences.tsx` (Appearance card)

## Memory update
After build, update `mem://index.md` Core: replace "Never light theme" with "Dark by default; optional light mode available via account dropdown (token-driven surfaces only — cinematic hero stays dark)."