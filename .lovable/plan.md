

# Add Role Filter Dropdown to Users Tab

Add a dropdown filter next to the search input that lets admins filter users by role (All, Admin, User).

## Changes

### Single file: `src/components/admin/UsersTab.tsx`

1. **Add `roleFilter` state** — `"all" | "admin" | "user"`, defaulting to `"all"`
2. **Add Select dropdown** — placed between the search input and Download Report button, using the existing `Select` component
3. **Update `filteredUsers` memo** — chain the role filter with the existing search filter
4. **Options**: "All Roles", "Admin", "User"

No new files, no API changes — extends the existing client-side filtering.

