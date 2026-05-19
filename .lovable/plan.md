# Replace logos across the app

The new wedge has a more elongated, slimmer silhouette than the current SVG path, and the wordmark uses a rounded geometric sans that we cannot recreate accurately as inline SVG text. So we ship the uploaded PNGs as authoritative assets and only keep SVGs where they need to scale crisply (favicon, in-app mark).

## Asset map

Copy uploads into the project:

| Upload | Destination | Used for |
|---|---|---|
| `Minimalist_Luxury_Logo_Design_May_19_2026.png` (amber + white wordmark) | `src/assets/logo-wordmark.png`, `public/logo-wordmark.png` | App headers (TopNav desktop wide, Landing nav, Analytics nav, Director hero label area) |
| `Minimalist_Luxury_Logo_Design_May_19_2026_1.png` (all-white wordmark) | `src/assets/logo-wordmark-white.png`, `public/logo-wordmark-white.png`, `public/og-image.jpg` (cropped/padded) | Transactional + auth email templates, social OG image |
| `Minimalist_Luxury_Logo_Design_May_19_2026_2.png` (amber wedge) | `public/logo-mark.png`, `src/assets/logo-mark.png`, regenerated `public/favicon.png`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/logo.png` | Favicon, PWA icons, top-nav mark, Install prompt, Welcome popup, Landing nav small `<Logo>`, JSON-LD `logo` |
| `Minimalist_Luxury_Logo_Design_May_19_2026_3.png` (white wedge) | `src/assets/logo-mark-white.png`, `public/logo-mark-white.png` | Director hero mark, AssistantAvatar (sits on amber/cyan glow — white reads better), DirectorChat background watermark |

We also regenerate trimmed SVGs of the wedge (amber + white) so the in-app `AperturalLogo` component and any size-fluid usages stay sharp. The wedge in the new uploads is a clean two-point shape — straightforward to redraw as `<path>` with the new proportions, matching the uploaded silhouette.

## File changes

1. **Copy uploaded PNGs** (4 files) into `public/` and `src/assets/` per the asset map.
2. **Regenerate trimmed wedge crops** for favicon/PWA icons (`favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `logo.png`) from the amber wedge upload using ImageMagick — square, tight crop, dark background preserved.
3. **Rewrite `public/logo-mark.svg` and `src/assets/logo-mark.svg`** with the new slimmer wedge geometry (amber fill via `#E89B3C`).
4. **Add `public/logo-mark-white.svg` and `src/assets/logo-mark-white.svg`** — same path, white fill — for the Director hero / AssistantAvatar where the mark sits on a colored glow.
5. **Rewrite `public/logo-wordmark.svg` and `src/assets/logo-wordmark.svg`** to embed the amber-Mov/white-Prompt wordmark PNG (since the font is non-standard) — or simply switch all wordmark imports to `.png`. Going with the PNG switch to avoid embedding base64.
6. **Update `src/components/AperturalLogo.tsx`** path data + add an optional `tone: "amber" | "white"` prop so DirectorChat and AssistantAvatar can request the white variant.
7. **Switch wordmark consumers to the new PNG**:
   - `src/pages/Landing.tsx` (`Logo` component + JSON-LD `logo` URL).
   - `src/components/TopNav.tsx` (wordmark in desktop nav if present; today it only uses the mark — leave as mark).
8. **Switch mark consumers to the new amber wedge**:
   - `src/components/TopNav.tsx` (already imports `@/assets/logo-mark.svg` — file gets overwritten, no code change needed).
   - `src/components/InstallPrompt.tsx`, `src/components/WelcomePopup.tsx`, `src/pages/Analytics.tsx` (already reference `/logo-mark.svg`).
9. **Switch hero/avatar mark to the new white wedge**:
   - `src/components/director/DirectorChat.tsx` hero `<img src={logoMark}>` → `logoMarkWhite`.
   - `src/components/director/AssistantAvatar.tsx` → `logoMarkWhite`.
10. **Email templates** (`supabase/functions/_shared/email-templates/*.tsx` and `_shared/transactional-email-templates/welcome.tsx`) — point any `<Img src="…logo…">` at `https://movprompt.com/logo-wordmark-white.png`.
11. **Regenerate OG image** from upload #1 (white wordmark) at 1200×630 with dark background padding → `public/og-image.jpg`. Confirms `index.html` and `Seo.tsx` references resolve correctly.
12. **QA pass**: visit Landing, Index (TopNav), Director hero, Analytics, InstallPrompt, WelcomePopup, Auth, ResetPassword in the preview at 1285×998 and verify the new marks render at the right size with no broken refs.

## Technical details

- ImageMagick is available via `nix run nixpkgs#imagemagick`. We will use it to produce the square favicon/PWA crops (`32×32`, `180×180`, `192×192`, `512×512`) and the 1200×630 OG image from the source uploads.
- Wedge SVG path: redraw to match the new aspect (the new mark is taller/narrower than the current `M14 7 L23 7 L9 27 Z`). New approximate path in a `0 0 32 32` viewBox: `M16 6 L24 6 L11 28 Z` — verified by overlaying against the cropped upload before committing.
- All wordmark consumers move from `.svg` to `.png` imports. Vite handles PNG imports natively; no config change needed.
- `AperturalLogo` keeps its current API (`size`, `className`) and gains an optional `tone` prop defaulting to `"amber"` so existing call sites don't change.
- Memory note (`.lovable/memory/index.md`) gets a small refresh: wordmark is now a PNG asset (rounded geometric sans), not Inter Tight as the original wordmark SVG implied.

## Out of scope

- No copy / color-token / typography changes beyond the logo assets.
- No new routes or components.
- `AperturalLogo` consumers outside the files listed above keep their current amber wedge with no behavior change.
