

# Add Marketing Section to Admin Dashboard

## What
Add a new "Marketing" tab to the admin dashboard with two features:
1. **Announcements & Banners** — Create, edit, and toggle promotional banners that display to users on the main app
2. **Email Campaign Tracker** — View email send history, delivery stats, and status breakdowns

## Plan

### 1. Database: Create `announcements` table

New table with columns:
- `id` (uuid, PK)
- `title` (text, required)
- `message` (text, required)
- `link_url` (text, nullable — optional CTA link)
- `link_text` (text, nullable — CTA button label)
- `type` (text — "info", "warning", "promo")
- `is_active` (boolean, default false)
- `starts_at` (timestamptz, nullable)
- `ends_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())
- `created_by` (uuid, references profiles)

RLS policies:
- Admins can SELECT/INSERT/UPDATE/DELETE
- Anonymous and authenticated users can SELECT where `is_active = true` (for displaying banners)

### 2. Create `AnnouncementsSection` component

Located at `src/components/admin/AnnouncementsSection.tsx`:
- Table listing all announcements with title, type badge, status (active/inactive), date range
- "New Announcement" button opening a dialog with form fields (title, message, type, link, date range)
- Toggle switch per row to activate/deactivate
- Edit and delete buttons per row
- Visual preview of how the banner will look

### 3. Create `EmailTracker` component

Located at `src/components/admin/EmailTracker.tsx`:
- Check if `email_send_log` table exists; if not, show a placeholder message ("Email tracking not yet configured")
- If it exists: show stat cards (total sent, failed, suppressed) and a log table with template name, recipient, status badge, timestamp
- Time range filter (24h, 7d, 30d)
- Deduplicate by `message_id` as required

### 4. Create `AnnouncementBanner` component for the main app

Located at `src/components/AnnouncementBanner.tsx`:
- Fetches active announcements from the `announcements` table
- Renders a dismissible banner at the top of the main page (Index.tsx)
- Styled to match the dark cinematic theme with type-based colors (info=cyan, warning=amber, promo=gradient)
- Stores dismissed state in localStorage so users don't see the same banner repeatedly

### 5. Update Admin Dashboard with Marketing tab

Add a third tab "Marketing" (with Megaphone icon) to `Analytics.tsx` containing:
- Announcements section at the top
- Email tracker section below

### 6. Wire banner into Index.tsx

Import and render `AnnouncementBanner` at the top of the main page.

## Files Changed
- Migration SQL — create `announcements` table with RLS
- `src/components/admin/AnnouncementsSection.tsx` — new
- `src/components/admin/EmailTracker.tsx` — new
- `src/components/AnnouncementBanner.tsx` — new
- `src/pages/Analytics.tsx` — add Marketing tab
- `src/pages/Index.tsx` — add AnnouncementBanner

