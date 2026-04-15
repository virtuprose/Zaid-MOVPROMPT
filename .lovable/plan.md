

# Fix Admin Login Redirect

## Problem
After signing in on `/admin/login`, the user lands on `/` instead of `/admin`. This is a race condition in `AuthGuard`:

1. Component mounts with `checkingRole = true` (good)
2. Auth is loading, `user` is null → effect runs, sets `checkingRole = false` (bad)
3. Auth finishes, `user` is set → effect re-runs, starts async `has_role` RPC
4. But `checkingRole` is already `false`, so the render logic sees `isAdmin = false` and redirects to `/`

## Fix
One change in `src/components/AuthGuard.tsx`: set `checkingRole` back to `true` before starting the role check.

```typescript
useEffect(() => {
  if (!requireAdmin || !user) {
    setCheckingRole(false);
    return;
  }

  setCheckingRole(true); // <-- ADD THIS LINE

  const checkAdmin = async () => {
    const { data } = await supabase.rpc("has_role", { _role: "admin" });
    setIsAdmin(!!data);
    setCheckingRole(false);
  };

  checkAdmin();
}, [user, requireAdmin]);
```

Single line addition. No other files affected.

