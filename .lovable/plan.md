## Goal

After clicking "Generate ad", the user should stay on `/marketing` and see a "generating…" card appear at the top of **Your recent ads**. When the render finishes, that card swaps to the finished video in place. No more navigating away to `/library`.

## Changes

### 1. `src/pages/MarketingStudio.tsx` — keep the user on the page

- In `doGenerate()`:
  - Remove `navigate("/library")`.
  - Change toast to `"Generating your ad…"`.
  - Capture the returned `VideoJob` from `submitVideoJob(...)` and prepend it to a new `pendingJobs` state list.
  - Scroll the gallery section into view so the new pending card is visible.
- Add `pendingJobs` state (`VideoJob[]`) alongside `userAds`.
- Add a polling effect: while `pendingJobs` is non-empty, every ~4s call `pollVideoJob(id)` for each pending job. When a job's `video_url` arrives:
  - Move it from `pendingJobs` into `userAds` (prepend).
  - Show a `toast.success("Your ad is ready")`.
  - On `error`, remove it from `pendingJobs` and toast the error.
- Update the gallery so the "Your recent ads" section renders whenever `pendingJobs.length > 0 || userAds.length > 0` — the empty/community state only shows when both are empty. Effectively: treat `pendingJobs.length + userAds.length` as the count that drives `mode`.
- Render pending cards before finished `userAds` cards in the grid.

### 2. New component — pending ad card

- Add an inline `PendingAdCard` (in the same file, next to `UserAdCard`) shaped like `UserAdCard`:
  - Same `aspect-[9/12]` rounded card with amber border glow.
  - Centered spinner + "Generating…" label.
  - Subtle shimmer background using existing `bg-muted/20` and a Tailwind `animate-pulse`.
  - "Generating" badge in the top-left corner (amber).
  - Non-clickable (or clickable to do nothing).

### 3. Out of scope

- Library page changes.
- Backend / `generate-video` edge function.
- Realtime subscriptions (polling is enough for one or two concurrent jobs from this surface).
- Persistence across reload — if the user reloads while generating, the next `userAds` fetch will pick up the finished job once it completes; no need to persist `pendingJobs` to localStorage in v1.

## Notes

- `submitVideoJob` already returns the inserted `VideoJob` row (with `id`, `status`, `video_url: null`), so we can build the pending card immediately without a refetch.
- `pollVideoJob` already exists in `src/lib/director/api.ts` and is used elsewhere — reuse it as-is.
- The `mode === "empty"` branch (community grid) should only show when there are zero pending and zero finished ads, otherwise a freshly-generating user would still see the community grid.
