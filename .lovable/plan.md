## Root cause

Confirmed via DB inspection:

- Every recent row in `prompt_history` has `image_paths = NULL` (last 15 checked).
- BUT the matching files do exist in the `generation-images` storage bucket at `{user_id}/{history_id}/frame_N.jpg`.
- The `prompt_history` table has only `SELECT`, `INSERT`, and `DELETE` RLS policies — **no `UPDATE` policy**.

So the post-insert `.update({ image_paths: paths })` call in `WorkflowPanel.tsx` (line 556-558) is silently blocked by RLS and affects 0 rows. The Library has nothing to render → "No reference image" placeholder for every card.

## Fix (3 parts)

### 1. Add the missing RLS UPDATE policy (migration)

```sql
CREATE POLICY "Users can update own history"
ON public.prompt_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 2. Backfill existing rows from storage (migration)

Storage objects are named `{user_id}/{history_id}/frame_N.jpg`, so we can reconstruct `image_paths` for all historic rows in one SQL pass:

```sql
UPDATE public.prompt_history ph
SET image_paths = sub.paths
FROM (
  SELECT
    split_part(name, '/', 2)::uuid AS history_id,
    array_agg(name ORDER BY name) AS paths
  FROM storage.objects
  WHERE bucket_id = 'generation-images'
  GROUP BY split_part(name, '/', 2)
) sub
WHERE ph.id = sub.history_id
  AND ph.image_paths IS NULL;
```

This restores reference thumbnails for every past generation that still has its files in storage.

### 3. Surface upload/update errors in `WorkflowPanel.tsx`

The current code logs `histErr` and `uploadErr` but ignores the `update()` error — exactly the one that was failing silently. Patch around lines 555–559:

```ts
if (paths.length > 0) {
  const { error: updateErr } = await supabase
    .from("prompt_history")
    .update({ image_paths: paths } as any)
    .eq("id", row.id);
  if (updateErr) console.error("History image_paths update failed:", updateErr);
}
```

So any future RLS/permission regression is visible in the console instead of silently breaking the Library again.

## Files / changes

- **New migration** — adds UPDATE policy + backfill UPDATE.
- **`src/components/WorkflowPanel.tsx`** — capture and log the update error (small change in the existing block).

No Library UI changes needed — the cards already read `entry.image_paths[0]` and sign a URL from `generation-images`; they just had nothing to read.