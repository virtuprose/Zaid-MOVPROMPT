

# Welcome Popup (One-Time Per Sign-In Session)

## Concept
A modal popup that admins can configure from the Marketing section. It displays once per user login session — tracked via `sessionStorage` so it resets on each new sign-in.

## Database Changes

**New table: `welcome_popups`**
- `id` (uuid, PK)
- `title` (text, required)
- `title_ar` (text, nullable)
- `message` (text, required)
- `message_ar` (text, nullable)
- `image_url` (text, nullable) — optional banner image
- `link_url` (text, nullable) — optional CTA link
- `link_text` (text, nullable)
- `link_text_ar` (text, nullable)
- `is_active` (boolean, default false) — only one should be active at a time
- `created_at` (timestamptz)
- `created_by` (uuid, nullable)

RLS: public read for active popups, admin-only write.

## Admin UI — Marketing Tab

**New component: `WelcomePopupSection.tsx`**
- List existing popups with toggle active/inactive
- Create/edit dialog with EN + AR fields for title, message, CTA link/text, image URL
- Only one popup can be active at a time (activating one deactivates others)
- Add to the Marketing tab in `Analytics.tsx`

## User-Facing — Index Page

**New component: `WelcomePopup.tsx`**
- On mount (when user is signed in), fetch the active welcome popup
- Check `sessionStorage` for a flag like `welcome_popup_seen_<popup_id>`
- If not seen, show a styled Dialog with bilingual content based on locale
- On close, set the sessionStorage flag so it won't show again this session
- Supports RTL/LTR based on language

## Files Modified
1. **Migration SQL** — create `welcome_popups` table with RLS
2. **`src/components/admin/WelcomePopupSection.tsx`** — new admin management component
3. **`src/pages/Analytics.tsx`** — add WelcomePopupSection to Marketing tab
4. **`src/components/WelcomePopup.tsx`** — new user-facing dialog component
5. **`src/pages/Index.tsx`** — render WelcomePopup when user is signed in
6. **`src/i18n/translations/en.ts`** — new translation keys
7. **`src/i18n/translations/ar.ts`** — new translation keys

