## Goal

Split the Library page into two clearly separated sections:

1. **Prompts** — existing `prompt_history` entries (Single frame, Two frames, Multi-shot)
2. **Videos** — generated videos from `video_jobs` table (Ads Studio + AI Director renders)

## UX

Top-level segmented toggle right under the page title:

```text
   [ Prompts (42) ]   [ Videos (7) ]
```

- Toggle switches between the two collections; only one is visible at a time.
- Each section keeps its own search + filter bar (independent state).
- Defaults to Prompts (current behavior preserved).
- URL syncs via `?tab=prompts|videos` so a refresh keeps you in place.

## Prompts section (unchanged)

Reuses existing `HistoryCard`, `ExpandedPromptModal`, search, workflow / model filters, and sort dropdown — no behavior change.

## Videos section (new)

Fetches from `video_jobs` filtered by `user_id = auth.uid()`, ordered newest first.

**Card layout** (`VideoJobCard`):
- 9:16 video thumbnail with autoplay-muted-loop on hover (poster frame when idle).
- Source pill (top-left): "Ads Studio" if `session_id IS NULL`, "AI Director" if `session_id` is set.
- Status pill (top-right): `queued` / `processing` (amber spinner) / `completed` / `failed`.
- Time-ago label.
- Footer actions:
  - **Open** → `<video>` modal with full-size playback + Download button (link to `video_url`).
  - **Copy prompt** → copies `prompt` field.
  - **Delete** kebab → soft delete (table currently lacks DELETE policy; see Data note).

**Filters for Videos**:
- Source chips: Ads Studio · AI Director
- Status chips: Completed · In progress · Failed
- Search across `prompt` text.

**Empty states**:
- No videos yet → CTA "Create your first ad" → `/marketing`, secondary "Open AI Director" → `/`.
- Filtered with no results → Clear filters.

## Data note

`video_jobs` RLS currently allows SELECT/INSERT/UPDATE for own rows but no DELETE. For "Delete" to work on video cards, the migration needs to add a DELETE policy:

```sql
CREATE POLICY "Users delete own video jobs"
  ON public.video_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

If you'd rather not allow deletion yet, the kebab is omitted from video cards in v1.

## Files

- `src/pages/Library.tsx` — add tab state, split data fetching, mount Prompts vs Videos branch.
- `src/components/library/VideoJobCard.tsx` — new, card + status pills.
- `src/components/library/VideoJobModal.tsx` — new, full-size playback + download + copy prompt.
- `src/components/library/VideosTab.tsx` — new, holds video list + filters/search/empty state.
- `src/components/library/PromptsTab.tsx` — extracted from current Library body (no logic change).
- (Optional) Supabase migration adding `video_jobs` DELETE policy.

## Out of scope

- No changes to Ads Studio or AI Director composers.
- No realtime updates of in-progress jobs (initial load only; can add later).
- No bulk select / multi-delete.

## Open questions

1. Should "Delete" be enabled for videos (requires the new RLS policy), or omitted for now?
2. Should in-progress jobs poll until completion, or just show their last-known status until refresh?
