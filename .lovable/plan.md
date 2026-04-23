
## Add "Revoke all sessions" button to Users toolbar

A new button next to the **All Roles** filter that signs every user out globally (forces them to re-login on next request). Useful after security incidents, role changes at scale, or before a major release.

### UI
- Location: `src/components/admin/UsersTab.tsx`, in the toolbar row, placed between the role `Select` and the existing **Download Report** button.
- Label: **"Revoke all sessions"** with a `LogOut` icon (lucide-react), `variant="outline"`, destructive-colored text (`text-destructive border-destructive/40 hover:bg-destructive/10`).
- Click → `AlertDialog` confirm: "Sign out all users? This will revoke every active session, including admins. You will be signed out too."
  - Confirm button: "Revoke all" (destructive)
  - Cancel button
- During execution: button shows spinner + disabled state.
- On success: toast `"Revoked N sessions"`, then redirect current admin to `/auth` (since their own session is gone too).

### Backend
- New edge function: `supabase/functions/admin-revoke-all-sessions/index.ts`
  - Verifies caller is admin (same pattern as `admin-force-signout`).
  - Uses `adminClient.auth.admin.listUsers()` (paginate through all pages).
  - For each user, calls `adminClient.auth.admin.signOut(user.id, "global")`.
  - Returns `{ success: true, count: N }`.
  - Logs failures per-user but continues; returns `failures` array if any.
- Deploy via `deploy_edge_functions`.

### Self-protection
Unlike `admin-force-signout`, this intentionally signs the caller out too (that's the point — "all sessions"). The frontend handles the redirect gracefully after the toast.

### i18n
Add keys under `admin.users.*`:
- `revokeAllSessions`, `revokeAllConfirmTitle`, `revokeAllConfirmDescription`, `revokeAllConfirmAction`, `revokeAllSuccess` (with `{count}` placeholder), `revokeAllError`
- EN + AR translations in `src/i18n/translations/{en,ar}.ts`

### Files touched
- `src/components/admin/UsersTab.tsx` — add button + AlertDialog + handler
- `supabase/functions/admin-revoke-all-sessions/index.ts` — new
- `src/i18n/translations/en.ts`, `src/i18n/translations/ar.ts` — new keys

### Verification
1. Click **Revoke all sessions** → confirm dialog appears.
2. Confirm → toast "Revoked N sessions" → admin redirected to `/auth`.
3. Open a second browser logged in as another user → next request returns 401, user redirected to login.
4. Cancel button closes dialog with no action.
5. AR layout: button label mirrors, dialog reads RTL.
