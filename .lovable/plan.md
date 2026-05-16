## Goal
In the Director chat video result panel (PromptResultCard), add **Download**, **Like**, and **Delete** action buttons, and make the inline video player match the generated clip's real aspect ratio (no black letterbox bars).

## Changes

### 1. `src/components/director/PromptResultCard.tsx` — action buttons
Replace the current "Download MP4" link row (lines ~240–248) with a compact action toolbar under the video:

- **Download** — keep the existing `<a href download>` behavior, restyle as an icon button (lucide `Download`).
- **Like** — heart icon (lucide `Heart`), filled + primary color when `job.liked === true`. Clicking toggles `video_jobs.liked` via `supabase.from("video_jobs").update({ liked: !job.liked }).eq("id", job.id)` and updates local `job` state. Optimistic update + toast on error.
- **Delete** — trash icon (lucide `Trash2`). Opens a small `AlertDialog` ("Delete this video? This cannot be undone."). On confirm, `supabase.from("video_jobs").delete().eq("id", job.id)` (RLS already allows owner delete), then `setJob(null)` so the panel disappears, plus a success toast.

All three buttons styled as `Button variant="ghost" size="sm"` in a flex row with `gap-1`, right-aligned, with `aria-label`s for a11y.

### 2. Aspect ratio fix (same file, line 238)
The `<video>` currently has `aspect-video` which forces 16:9 and produces black bars for 9:16 / 1:1 / 4:3 clips.

Replace with intrinsic sizing:
```tsx
<video
  src={job.video_url}
  controls
  playsInline
  className="w-full rounded-md bg-black max-h-[70vh] object-contain"
/>
```
This lets the browser use the video's real intrinsic ratio. `max-h-[70vh]` prevents tall 9:16 clips from dominating the chat. `bg-black` only shows if the user resizes the player — there are no forced letterbox bars because the container hugs the video.

(Optional small enhancement, deferred unless you want it: also pass `style={{ aspectRatio: knownRatio }}` before metadata loads to avoid a layout shift. Will skip unless requested.)

### 3. Library tab consistency (small touch-up)
`src/components/library/VideosTab.tsx` already has Like / Delete / Download in its detail dialog — but the inline grid card thumbnail also uses `object-cover` which crops. Leave the grid (thumbnails should be uniform) but verify the **detail dialog `<video>`** uses `object-contain` (it already does at line 652). No change needed.

## Out of scope
- No DB migration (the `liked` and `deleted_at` columns already exist; we'll use a hard `delete` rather than soft delete since the RLS policy permits it and the column is unused elsewhere).
- No changes to the generation pipeline or fal payload — aspect ratio is already passed correctly; this is purely a player display fix.
- No changes to the Library page beyond what's noted.

## Files touched
- `src/components/director/PromptResultCard.tsx` (only — ~30 lines changed in the `renderVideoPanel` function, plus a new `AlertDialog` import).

Approve and I'll implement.