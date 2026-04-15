

# Add User Management to Admin Dashboard

## What
Add a "Users" section to the admin dashboard showing all registered users in a table, with the ability to edit user details (display name, role) and view their information.

## Current State
- 3 users exist: buziyadd@gmail.com (admin), icedtaster@gmail.com, rjrmousherji@gmail.com
- Profiles table has: id, email, display_name, avatar_url, created_at
- User roles table has: user_id, role (admin/user)
- Only admins can read analytics tables; profiles are restricted to own-read

## Plan

### 1. Database: Add RLS policy for admin to read all profiles
Create a migration adding a SELECT policy on `profiles` so admins can see all users:
```sql
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role('admin'::app_role));
```

Also add admin SELECT on `user_roles` (currently users can only read their own):
```sql
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role('admin'::app_role));
```

Add admin UPDATE on `profiles`:
```sql
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role('admin'::app_role));
```

Add admin INSERT/UPDATE/DELETE on `user_roles` so admins can assign roles:
```sql
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));
```

### 2. Update Analytics page with Users tab
Add a tabbed layout to the admin dashboard:
- **Analytics** tab (existing charts/stats)
- **Users** tab (new user management)

The Users tab will show:
- Table with columns: Avatar, Name, Email, Role, Joined
- Edit button per row opening a dialog to update display_name and toggle admin role
- Badge showing role (admin vs user)

### 3. Edit User Dialog
A dialog with:
- Display name input (editable)
- Role toggle (admin/user) via a select dropdown
- Save button that updates `profiles` and `user_roles` tables

## Files Changed
- `src/pages/Analytics.tsx` — add Tabs layout, users table, edit dialog
- Migration SQL — add admin RLS policies on profiles and user_roles

