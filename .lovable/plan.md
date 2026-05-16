## Goal
Add Download, Like, and Delete actions to each generated video card on the Marketing Studio (`UserAdCard`), plus a couple of optional extras worth considering.

## Changes

### 1. Database (migration)
- Add `liked boolean NOT NULL default false` to `video_jobs` (per-user likes; each job already belongs to one user, so a column is simpler than a join table).
- Add a `DELETE` RLS policy on `video_jobs`: `auth.uid() = user_id`.
- (Optional) Add `deleted_at timestamptz` for soft-delete + an undo toast — safer than hard delete. **Recommendation: soft-delete.**

### 2. Card UI (`UserAdCard` in `src/pages/MarketingStudio.tsx`)
Overlay action bar appearing top-right on hover (and always visible on touch), using the existing dark cinematic tokens — circular icon buttons with `bg-black/50 backdrop-blur` and cyan/amber hover glow:

- **Download** (`Download` icon) — fetches `video_url` as a blob and triggers a `.mp4` download with filename `vidoprompt-<shortId>.mp4`. Avoids opening a new tab.
- **Like** (`Heart` icon) — toggles `liked`, optimistic update, filled amber when liked.
- **Delete** (`Trash2` icon) — opens the same themed `AlertDialog` pattern used for cancel ("Delete this ad? This can't be undone." or "Move to trash" if soft-delete), then removes from `userAds` and DB.

Click on the video body still navigates to `/library`; action buttons `stopPropagation`.

### 3. Data layer (`src/lib/director/api.ts` or inline)
- `toggleLikeAd(id, liked)` → update `video_jobs`.
- `deleteAd(id)` → delete (or set `deleted_at`).
- Update the initial fetch query to exclude soft-deleted rows if we go that route.

### 4. Suggested extras (let me know which to include)
- **Copy prompt** (`Copy` icon) — pulls `video_jobs.prompt` to clipboard. Very useful for iterating.
- **Regenerate / Remix** (`RefreshCw` icon) — loads the original prompt back into the composer for a new variation.
- **Share link** (`Share2` icon) — copies the public video URL (or a `/library/:id` route) to clipboard.
- **Aspect-ratio badge** in the corner so users can see at a glance whether it's 9:16 / 16:9 / 1:1.
- Show **liked-only filter** in the Recent Ads header.

## Technical notes
- Reuse the `AlertDialog` already imported for cancellation — same visual language for destructive confirms.
- Action bar uses `opacity-0 group-hover:opacity-100 transition` on desktop, `opacity-100` on `sm:` and below so mobile users can always tap.
- Download via `fetch(video_url).then(r => r.blob())` + `URL.createObjectURL` — works for the signed Supabase URLs already in use.
- Sonner toasts for feedback: "Downloaded", "Added to favorites", "Ad deleted".

## Open questions for you
1. **Delete**: hard delete or soft-delete with an "Undo" toast? (I recommend soft-delete.)
2. Want any of the extras above (copy prompt, remix, share, aspect badge, liked filter)?