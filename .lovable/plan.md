

# Add "Download Users Report" to Users Tab

Add a CSV download button to the Users tab, matching the Analytics tab pattern.

## Changes

### Single file: `src/components/admin/UsersTab.tsx`

1. **Add `downloadUsersCSV` function** that exports the `users` array as CSV with columns: Name, Email, Role, Joined
2. **Add "Download Report" button** with `Download` icon above the users table, styled identically to the Analytics tab button

The implementation mirrors the existing `downloadCSV` pattern in `AnalyticsTab.tsx` — pure client-side, no new API calls.

