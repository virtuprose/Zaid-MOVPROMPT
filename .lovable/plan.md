# Show all generated videos in "Your recent ads"

Today the gallery fetches up to 24 videos but only renders 4 in `mixed` mode and 8 in `full` mode. Everything else is hidden until the user clicks "Browse all".

## Fix

`src/pages/MarketingStudio.tsx`:

1. Raise the fetch limit on the `video_jobs` query (line ~169) from `.limit(24)` to `.limit(100)` so the page has the full recent history available.
2. Drop the slice caps so every fetched ad renders:
   - `mixed` mode (line ~811): `userAds.slice(0, Math.max(0, 4 - pendingJobs.length))` → `userAds`.
   - `full` mode (line ~857): `userAds.slice(0, Math.max(0, 8 - pendingJobs.length))` → `userAds`.
3. Keep the existing responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3` layout — it scales cleanly to many items.
4. Keep the "Browse all N →" link (it still navigates to the Library page where full history lives).

No backend, schema, or query-filter changes — the query already returns every Marketing/Director video the user owns.
