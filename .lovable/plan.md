

# Set Up Admin Account

## Overview
Create an admin user account with the specified credentials and assign the admin role.

## Steps

### 1. Create the user account
- Sign up `buziyadd@gmail.com` with password `Rashed#912` via the auth system
- Auto-confirm the email so the account is immediately usable

### 2. Assign admin role
- Run a migration to insert the admin role for this user into the `user_roles` table
- Use a SQL migration that looks up the user by email from `auth.users` and inserts into `user_roles` with role `'admin'`

### 3. Enable auto-confirm (temporarily)
- Use the auth configuration tool to enable email auto-confirm so the account can be created without email verification
- After account creation, disable auto-confirm to restore normal signup flow

## Technical Details
- Migration SQL will do: `INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = 'buziyadd@gmail.com'`
- The user will be created via `supabase.auth.signUp()` or via the admin API in an edge function
- The `has_role` function already exists to check admin access

