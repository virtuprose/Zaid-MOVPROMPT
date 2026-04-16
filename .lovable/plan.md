

# Bilingual Notifications & Announcements (EN/AR)

## Approach
Add Arabic translation fields to the database tables and update all related components to display content in the user's selected language.

## Database Changes (Migration)

**`notifications` table** — add columns:
- `title_ar` (text, nullable)
- `message_ar` (text, nullable)

**`announcements` table** — add columns:
- `title_ar` (text, nullable)
- `message_ar` (text, nullable)
- `link_text_ar` (text, nullable)

## Admin UI Changes

### NotificationsSection.tsx
- Import `useLanguage`
- Add Arabic title and message fields to the create/send dialog (two inputs each: English + Arabic)
- Save `title_ar` and `message_ar` alongside the existing fields

### AnnouncementsSection.tsx
- Add Arabic title, message, and CTA text fields to the create/edit dialog
- Save `title_ar`, `message_ar`, and `link_text_ar` alongside existing fields

## User-Facing UI Changes

### NotificationBell.tsx
- Import `useLanguage`
- Display `title_ar` / `message_ar` when language is Arabic, fall back to English fields

### AnnouncementBanner.tsx
- Already imports `useLanguage`
- Display `title_ar` / `message_ar` / `link_text_ar` when language is Arabic, fall back to English

## Translation Keys
Add to `en.ts` and `ar.ts`:
- `notifications.title`, `notifications.markAllRead`, `notifications.empty`
- `notifications.form.title`, `notifications.form.titleAr`, `notifications.form.message`, `notifications.form.messageAr`
- `announcements.form.titleAr`, `announcements.form.messageAr`, `announcements.form.linkTextAr`

## Files Modified
1. **Migration SQL** — alter `notifications` and `announcements` tables
2. `src/components/admin/NotificationsSection.tsx` — Arabic input fields
3. `src/components/admin/AnnouncementsSection.tsx` — Arabic input fields
4. `src/components/NotificationBell.tsx` — language-aware display
5. `src/components/AnnouncementBanner.tsx` — language-aware display
6. `src/i18n/translations/en.ts` — new keys
7. `src/i18n/translations/ar.ts` — new keys

