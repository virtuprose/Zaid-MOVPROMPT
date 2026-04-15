
## Fix Admin Dashboard Flow

### Diagnosis
The admin role check is succeeding, but the app still renders the main page first. The evidence is:
- `has_role` returns `true`
- right after login, `page_visits` logs `/`, which means `Index` mounted
- current `AuthGuard` can still render the `Navigate to="/"` branch in the brief render between:
  1. auth session becoming available
  2. admin role check finishing for that user

There is also a second flow problem:
- `AdminLogin` redirects any authenticated user to `/admin` immediately, without first confirming they are actually an admin
- that makes the admin flow feel mixed/confusing

### What I’ll change

#### 1. Make `AuthGuard` wait for the correct admin check result
Update `src/components/AuthGuard.tsx` so it:
- keeps a dedicated admin-role loading state tied to the current user
- does not clear role-check loading while auth is still restoring
- only redirects to `/admin/login` after auth is fully resolved and no user exists
- only redirects away from `/admin` after the role check for the current user has completed and confirmed they are not admin
- ignores stale role-check results if the user changes during the async request

This is the main fix.

#### 2. Fix `AdminLogin` redirect logic
Update `src/pages/AdminLogin.tsx` so it:
- does not auto-navigate to `/admin` just because `user` exists
- verifies admin role first, then navigates
- keeps non-admin authenticated users on the admin login page instead of bouncing them into a broken loop
- shows a clear error/toast if the signed-in account is not an admin

This will make the flow predictable.

#### 3. Make the admin destination visually obvious
Update `src/pages/Analytics.tsx` slightly so the page clearly reads as an admin dashboard, for example:
- “Admin Dashboard”
- “Analytics overview”

This is small, but it will help confirm the user landed in the right place.

### Files to update
- `src/components/AuthGuard.tsx`
- `src/pages/AdminLogin.tsx`
- `src/pages/Analytics.tsx`

### Expected flow after fix
```text
/admin
  -> if not signed in: show /admin/login
  -> if signed in and admin: show loading spinner briefly, then /admin dashboard
  -> if signed in but not admin: stay out of dashboard and show clear rejection

/admin/login
  -> if already signed in and admin: go to /admin
  -> if already signed in but not admin: remain on login page with clear message
```

### Note
I also spotted a separate console warning from the home-page account dropdown (`Function components cannot be given refs`). That is unrelated to the admin redirect bug, so I would keep this fix focused on the auth/admin flow first.
