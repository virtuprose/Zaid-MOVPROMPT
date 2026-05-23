## Goal

Get rid of the empty black + spinner flash users see on refresh before Ads Studio (and other guarded pages) paints. The current `AuthGuard` shows a centered `Loader2` on `bg-background` until `supabase.auth.getSession()` resolves, then swaps in the full page. The swap is what reads as a "glitch."

## Approach

Make the loading state visually continuous with the destination page instead of a context-less spinner.

### 1. Render the top nav immediately during auth loading

`AuthGuard` currently hides everything until auth resolves. Update it to render the persistent chrome (`<TopNav />`) above the loading indicator so the page frame is stable across the transition. The nav doesn't depend on `user` to render its shell (auth-aware bits already handle a null user).

### 2. Allow callers to pass a route-specific skeleton

Add an optional `fallback?: React.ReactNode` prop to `AuthGuard`. When provided, render `<TopNav />` + `fallback` during the loading window instead of the generic spinner. Keep the spinner as the default for routes that don't supply one.

### 3. Add a lightweight Ads Studio skeleton

Create `src/components/marketing/MarketingStudioSkeleton.tsx` that mirrors the real page's hero layout: centered title block, the composer card (product/avatar chips, textarea, format/scene/brand row), and a faint 3-card row under "Ads made with Ads Studio". Use existing `Skeleton` primitive and design tokens — no new colors. This is presentational only, no logic, no data fetches.

### 4. Wire the skeleton in App.tsx

Update the `/marketing` route:

```text
<Route
  path="/marketing"
  element={
    <AuthGuard fallback={<MarketingStudioSkeleton />}>
      <MarketingStudio />
    </AuthGuard>
  }
/>
```

Other guarded routes keep current behavior (no change needed now; we can add per-page skeletons later if useful).

### 5. Keep MarketingStudio unchanged

No business-logic edits. The page already renders its empty state correctly once mounted — the issue is purely the pre-mount gap.

## Files touched

- `src/components/AuthGuard.tsx` — add `fallback` prop, render `<TopNav />` during loading, render `fallback` instead of spinner when provided.
- `src/components/marketing/MarketingStudioSkeleton.tsx` — new file, presentational skeleton matching the Ads Studio hero.
- `src/App.tsx` — pass the skeleton as `fallback` to the `/marketing` AuthGuard, add the import.

## Out of scope

- No changes to auth flow, session restoration, or Supabase client.
- No changes to other guarded routes' loading UX in this pass.
- No changes to MarketingStudio's data fetching or empty state.

## Verification

- Hard refresh `/marketing` while signed in → top nav appears instantly, skeleton fills the hero area, then real content fades in without the black flash.
- Signed-out refresh of `/marketing` → still redirects to `/auth` (AuthGuard's redirect path unchanged).
- Other guarded routes (`/library`, `/director`, `/admin`) continue to show the spinner fallback — no regression.
