

## Security Audit Results

### What's Already Secure (No Action Needed)
- All 10 tables have RLS enabled
- Admin access uses proper `has_role()` security definer function — no client-side role checks
- Edge functions (`analyze-scene`, `generate-prompt`) validate JWT tokens, enforce rate limiting, and validate input
- Email infrastructure tables are locked to `service_role` only
- `prompt_history` is properly scoped to `auth.uid() = user_id`
- Profiles table: users can only read/update their own row; admins get full access
- The permissive INSERT policies on `page_visits` and `generation_events` are intentional (anonymous analytics tracking) and read access is admin-only

### Issues Found — Needs Fixing

**1. Four database functions missing `search_path` (Medium Risk)**

The functions `enqueue_email`, `read_email_batch`, `delete_email`, and `move_to_dlq` don't have `search_path` set. This could allow search path hijacking if a malicious schema is injected.

**Fix:** Run a migration to add `SET search_path = public` to each of these 4 functions, matching the pattern already used by `has_role` and `handle_new_user`.

### Files Changed
- One database migration to alter the 4 functions with `SET search_path = public`

### What Won't Change
- No changes to edge functions (already secure)
- No changes to RLS policies (already properly configured)
- No changes to application code

