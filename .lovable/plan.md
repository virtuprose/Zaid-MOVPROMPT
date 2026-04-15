

# Require Authentication for Main Page

## Problem
The `/` route loads `Index` without any auth check, so users see the app without signing in.

## Fix
Wrap the `<Index />` route with `<AuthGuard>` in `App.tsx`, so unauthenticated users are redirected to `/auth`.

```
<Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
```

One line change in `src/App.tsx`.

