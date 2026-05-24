## Brand kit "On" badge doesn't appear after save

### Root cause

`useBrandIdentity()` in `src/lib/marketing/brandIdentity.ts` is a hook with **local `useState`**. Every consumer that calls it (the chip in `MarketingStudio.tsx` and the form in `BrandIdentitySheet.tsx`) gets its own independent copy of `identity`. When the sheet calls `save()`, only the sheet's local copy reloads — the page's copy stays `null`, so the chip never flips to the amber "On" state until a hard refresh.

### Fix

Make `useBrandIdentity` share a single source of truth across all consumers, so saving in the sheet updates the chip in the same render.

Convert `brandIdentity.ts` to a tiny module-level store + `useSyncExternalStore` subscription:

```ts
// module-level state
let currentIdentity: BrandIdentity | null = null;
let currentLoading = true;
let currentUserId: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function loadFor(userId: string | null) {
  currentUserId = userId;
  currentLoading = true; emit();
  if (!userId) { currentIdentity = null; currentLoading = false; emit(); return; }
  const { data } = await supabase.from("brand_identities")...maybeSingle();
  currentIdentity = data ? mapRow(data, await signLogo(data.logo_path)) : null;
  currentLoading = false; emit();
}

export function useBrandIdentity() {
  const { user } = useAuth();
  const identity = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => currentIdentity,
    () => currentIdentity,
  );
  const loading = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => currentLoading,
    () => currentLoading,
  );
  useEffect(() => {
    if ((user?.id ?? null) !== currentUserId) loadFor(user?.id ?? null);
  }, [user?.id]);

  const reload = useCallback(() => loadFor(user?.id ?? null), [user?.id]);
  const save = useCallback(async (next) => { ...upsert; await reload(); }, [reload]);
  const clear = useCallback(async () => { ...delete; await reload(); }, [reload]);
  // uploadLogo unchanged

  return { identity, loading, save, clear, uploadLogo, reload };
}
```

After save, `emit()` fires once and **every** consumer re-renders — the chip in the composer immediately gets `hasBrandIdentity(brandIdentity) === true` and renders the amber "On" pill.

### Bonus polish (small)

In `MarketingStudio.tsx` the current "On" pill is a 9px text label. Make it a touch more visible: keep the label and add a small filled dot or check icon (e.g. `<Check className="w-3 h-3 text-[#F5A524]" />` before "On"), so the saved state reads at a glance. No layout shift.

### Files touched

- `src/lib/marketing/brandIdentity.ts` — convert hook to shared module store with `useSyncExternalStore`. Public API (`identity`, `loading`, `save`, `clear`, `uploadLogo`, `reload`) unchanged so no other file needs edits.
- `src/pages/MarketingStudio.tsx` — add a tiny `Check` icon next to the "On" label in the Brand kit chip (line ~946–948).

### Out of scope

- No DB changes.
- No changes to `BrandIdentitySheet` — its save flow already calls `save()` then closes the sheet.
- `useBrandKit` (separate hook for multi-product brand kits) is untouched.
