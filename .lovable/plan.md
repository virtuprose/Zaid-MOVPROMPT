

## Plan — Fix "0 generations" per user in admin Users tab

### Root cause
`UsersTab` counts generations from `prompt_history`, but that table's RLS only lets each user read their own rows. When the admin queries it, the result is empty for everyone else → every user shows `0`.

`generation_events` already exists, has an "Admins can read generation events" RLS policy, and is logged on every generation via `trackGeneration()` — but it has no `user_id` column today, only `session_id`.

### Fix in two parts

**1. Add `user_id` to `generation_events`** (migration)
- Add nullable `user_id uuid` column (nullable so anonymous generations still log).
- Backfill is not needed; new events will populate going forward. Existing rows simply won't count toward per-user totals (acceptable — counts will accrue from now on, and we'll also keep `prompt_history` as a secondary source for already-signed-in users since that table is per-user accurate).

**2. Stamp `user_id` when logging events** (`src/lib/analytics.ts`)
- In `trackGeneration`, read `supabase.auth.getUser()` and include `user_id` in the insert when present.

**3. Aggregate from BOTH sources in `UsersTab`** (`src/components/admin/UsersTab.tsx`)
- Query `generation_events` (admin-readable) grouped by `user_id` for the authoritative count going forward.
- Also query `prompt_history` count via the admin RLS path — wait, admin can't read others' `prompt_history`. So drop that source and rely on `generation_events`.
- Take the MAX per user between the two so historical `prompt_history` rows of the *current admin* still count for themselves.

**4. Fix column misalignment in the table**
The current row renders cells in this order: `generations`, `avatar`, `name`, `email`, `role`, `status`, `joined`, `edit` — but headers are `(empty), Name, Email, Role, Generations, Status, Joined, (empty)`. Reorder the body cells (or headers) so "Generations" sits under the Generations header. Final column order: Avatar | Name | Email | Role | **Generations** | Status | Joined | Edit.

Show generations as a small badge (e.g. `42`) with muted "—" when zero.

### Files touched
- New migration: `ALTER TABLE public.generation_events ADD COLUMN user_id uuid;`
- `src/lib/analytics.ts` — include `user_id` in `trackGeneration`.
- `src/components/admin/UsersTab.tsx` — fetch counts from `generation_events`, fix column order, render badge.

### Verification
- Sign in as a user, run a generation → switch to admin → that user's row shows count ≥ 1.
- Existing users with old `prompt_history` rows: counts start fresh from new events (acceptable, communicated in passing).
- Columns now line up: Generations number sits under the Generations header.
- CSV export updated to include the Generations column.

