

# Add Search to Users Tab

Add a search/filter bar above the users table that filters by name or email in real-time.

## Changes

### Single file: `src/components/admin/UsersTab.tsx`

1. **Add `searchQuery` state** — empty string, updated on input change
2. **Add search input** — placed in the header row next to the "Download Report" button, with a `Search` icon from lucide-react
3. **Filter users** — `useMemo` that filters `users` by checking if `display_name` or `email` includes the lowercase query
4. **Use filtered list** — render `filteredUsers` in the table and update the count in the card header

No new files, no API changes — pure client-side filtering of already-fetched data.

