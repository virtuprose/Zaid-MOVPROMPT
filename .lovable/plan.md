
## Admin → Users → "Edit user" upgrade bundle

Transform the current Edit modal (display name, role, status) into a richer **User detail drawer** with activity insight, communication tools, internal notes, and a danger zone.

### 1. Activity snapshot (4 stat tiles)
Top of the drawer, read-only:
- **Total generations** (all-time count from `generation_events`)
- **Last 30 days** (already computed for the table — reuse)
- **Last active** (max `created_at` from `generation_events`; "—" if never)
- **Last sign-in** (from `auth.users.last_sign_in_at` via admin client)

Plus a one-line workflow breakdown: `single 12 · two-frame 4 · multi-shot 7`.

### 2. Recent prompts (last 5)
Compact list from `prompt_history` for that `user_id`, ordered desc, limit 5:
- First image thumbnail (signed URL from `generation-images` bucket) or model icon if none
- Workflow type + target model badge
- Relative timestamp ("3h ago")
- Footer link: **"View full Library →"** (admin-scoped library view, deferred — for now link disabled with tooltip "coming soon" OR open user's library filtered by id if feasible).

### 3. Email & communication controls
Section with:
- **Email verified** badge (green check / amber warning) from `auth.users.email_confirmed_at`
- **Suppression status** — query `suppressed_emails` by email; if found show reason badge (bounce / complaint / unsubscribe)
- **Auth provider** badge — Google vs Email (from `auth.users.app_metadata.provider`)
- Buttons:
  - **Send password reset** → calls a new edge function that uses admin client `generateLink({ type: 'recovery' })` and enqueues via existing transactional email pipeline
  - **Resend welcome email** → enqueues `welcome` template via existing `send-transactional-email` function

### 4. Admin notes (internal)
- New column `profiles.admin_notes text` (nullable) via migration
- Textarea in drawer, autosaved on blur with toast confirmation
- Only admins can read/write (RLS already covers admin read/update on profiles)
- Small "Last edited by … · 2d ago" line — store editor in `profiles.admin_notes_updated_by uuid` and `admin_notes_updated_at timestamptz`

### 5. Danger zone
Visually separated red-bordered section at the bottom:
- **Force sign-out** — new edge function calls `auth.admin.signOut(userId, 'global')` to revoke all sessions
- **Delete account** — new edge function calls `auth.admin.deleteUser(userId)`; cascades through existing FKs; requires typing the user's email to confirm in an `AlertDialog`
- Both blocked when target = caller (self-protection, like existing toggle)

### Layout change
Current modal is small. Switch from `Dialog` → `Sheet` (right-side drawer, `sm:max-w-2xl`) so all sections fit without scrolling fatigue. Keep existing fields (display name, role, account status switch) at the top in an "Account" section. EN/AR via existing `t()`.

### Technical details

**Migration**
```sql
ALTER TABLE public.profiles
  ADD COLUMN admin_notes text,
  ADD COLUMN admin_notes_updated_by uuid,
  ADD COLUMN admin_notes_updated_at timestamptz;
```

**New edge functions** (all verify caller is admin via `has_role`, like `toggle-user-status`):
- `admin-send-password-reset` — generates recovery link, enqueues `recovery` email
- `admin-resend-welcome` — enqueues `welcome` transactional email
- `admin-force-signout` — `auth.admin.signOut(userId, 'global')`
- `admin-delete-user` — `auth.admin.deleteUser(userId)` after confirm

**Data fetching**
- Extend `fetchUsers` in `UsersTab.tsx` to also pull `last_sign_in_at`, `email_confirmed_at`, provider via `auth.admin.listUsers()` (already partially used) — merge into `UserRow`
- On drawer open, lazy-fetch: recent 5 prompts, suppression row, full event count + workflow breakdown for that user
- Thumbnails via `supabase.storage.from('generation-images').createSignedUrl(path, 3600)`

**Files touched**
- `src/components/admin/UsersTab.tsx` — replace Dialog with Sheet, add sections
- New `src/components/admin/UserDetailDrawer.tsx` — extract drawer to its own file (UsersTab is already long)
- New edge functions under `supabase/functions/admin-*`
- New translation keys in `src/i18n/translations/{en,ar}.ts` (admin.userDrawer.*)
- 1 migration

### Out of scope
- Admin-side filtered library view (linked but not built)
- Bulk actions (multi-select)
- Audit log of admin actions (worth its own pass later)
- Editing email address (high-risk; defer)

### Verification
1. Open a user → drawer slides in with 4 stat tiles populated, recent 5 prompts visible
2. "Send password reset" → user receives recovery email; toast confirms
3. "Resend welcome" → welcome email lands
4. Type a note → blur → reload page → note persists, shows "edited by you · just now"
5. "Force sign-out" → target user's next request returns 401 in another browser
6. "Delete account" → requires typing email; on confirm, user vanishes from list, their `prompt_history` cascades
7. Self-actions (delete/sign-out yourself) blocked with toast
8. AR layout: drawer mirrors, no overflow
