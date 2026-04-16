

# RTL/LTR Direction for Notifications & Announcements

The `document.documentElement.dir` is already set globally by `LanguageContext`, but individual notification/announcement items need explicit `dir` attributes so their text aligns correctly based on the displayed language (not just the global setting — since content could be in either language).

## Changes

### 1. NotificationBell.tsx
- Add `dir` attribute to each notification item based on locale: `dir={locale === "ar" ? "rtl" : "ltr"}`
- Change `text-left` to `text-start` on the button so it respects direction
- Change `ml-4` to `ms-4` (logical margin) for proper RTL spacing
- Add `dir` to the popover header

### 2. AnnouncementBanner.tsx
- Add `dir={locale === "ar" ? "rtl" : "ltr"}` to each announcement banner div
- Already uses `me-` and `ms-` logical properties — no changes needed there

### Files Modified
1. `src/components/NotificationBell.tsx`
2. `src/components/AnnouncementBanner.tsx`

