

# Admin Login — Standalone Sign-In Page

## Problem
When visiting `/admin`, unauthenticated users are redirected to the full `/auth` page with marketing content and signup options. The user wants `/admin` to show only a minimal sign-in form — no marketing, no signup tab.

## Plan

### 1. Create `src/pages/AdminLogin.tsx`
A minimal dark-themed login page with:
- Only email + password sign-in (no Google, no signup tab, no marketing)
- On successful sign-in, redirect to `/admin` (where AuthGuard checks admin role)
- Forgot password link still available

### 2. Update `AuthGuard.tsx`
Change the redirect for unauthenticated users: when `requireAdmin` is true, redirect to `/admin/login` instead of `/auth`.

### 3. Update `App.tsx`
Add route: `<Route path="/admin/login" element={<AdminLogin />} />`

## Technical Notes
- AdminLogin will use `supabase.auth.signInWithPassword` directly
- After sign-in, `useEffect` navigates to `/admin`, where AuthGuard verifies admin role
- If a non-admin signs in, they get bounced to `/` as before
- No new dependencies needed

