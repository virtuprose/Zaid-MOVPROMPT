

## Plan — Wire official MovPrompt logos into the app

### Assets to add
Copy uploaded logos into the project:

**`public/`** (PWA / favicon / meta — referenced by URL):
- `MovPrompt_Logo_Mark.svg` → `public/logo-mark.svg` (replace inline SVG usage where needed)
- `MovPrompt_Logo_Mark_64.png` → `public/favicon.png` (replace current favicon)
- `MovPrompt_Logo_Mark_128.png` → `public/icon-192.png` source upgrade (keep filename for manifest — actually upload as `icon-192.png` replacement using the 256 version for crispness)
- `MovPrompt_Logo_Mark_512.png` → `public/icon-512.png` (replace existing)
- `MovPrompt_Logo_Mark_256.png` → `public/apple-touch-icon.png` (new, 256 is fine; iOS upscales)

**`src/assets/`** (bundled, imported in React components):
- `MovPrompt_Logo_Mark.svg` → `src/assets/logo-mark.svg`
- `MovPrompt_Logo_Wordmark.svg` → `src/assets/logo-wordmark.svg`

### Code touchpoints

**1. `index.html`**
- Splash screen `<img>` already points to `/icon-192.png` — will auto-pick up the new file. No change needed beyond file replacement.
- Add `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`.

**2. `src/pages/Index.tsx` (hero)**
- Currently shows text-only "Mov**Prompt**". Add the logo mark to the left of the wordmark:
  ```tsx
  <img src={logoMark} alt="" className="w-10 h-10 sm:w-14 sm:h-14" />
  <h1>Mov<span className="text-primary">Prompt</span></h1>
  ```

**3. `src/pages/Auth.tsx` (marketing left column)**
- Add wordmark SVG above the hero title at top of the left column (above `auth.heroTitle`).

**4. `src/pages/Library.tsx` (top bar)**
- Replace the text-only "MOVPROMPT" back button label with the logo mark + text.

**5. `src/pages/Analytics.tsx` (admin header)**
- Add small logo mark next to the "Admin Dashboard" heading.

**6. `src/components/WelcomePopup.tsx`**
- Add logo mark at the top of the welcome dialog (visual brand reinforcement on first visit).

**7. `src/components/InstallPrompt.tsx`**
- Replace the generic `<Download>` icon tile with the actual logo mark for stronger brand recognition in the install card.

### Files touched
- `public/favicon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/logo-mark.svg` (new files / replacements)
- `src/assets/logo-mark.svg`, `src/assets/logo-wordmark.svg` (new)
- `index.html` (one line: apple-touch-icon)
- `src/pages/Index.tsx` (hero)
- `src/pages/Auth.tsx` (left marketing column)
- `src/pages/Library.tsx` (top bar)
- `src/pages/Analytics.tsx` (admin header)
- `src/components/WelcomePopup.tsx` (header)
- `src/components/InstallPrompt.tsx` (icon tile)

No backend, DB, or translation changes needed. Frontend changes will require **Publish → Update** to reach live users on movprompt.com.

