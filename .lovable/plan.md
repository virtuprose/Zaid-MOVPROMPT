Add Favorite, Download, More-actions (Recreate / Add to folder / Publish / Delete), and "+ Add to task" controls to each card in the Media panel — matching the dark-pill style in the reference screenshots.

## UI changes — `src/components/director/MediaRailPanel.tsx`

`MediaCard` becomes a hoverable container that overlays:

- **Top-right column** (stacked, 28px round dark pills, `bg-black/55 backdrop-blur`):
  - `Heart` — filled when favorited, primary cyan tint
  - `Download` — saves the file (works for both image and video)
  - `MoreVertical` — opens the actions dropdown
- **Bottom-right pill** — `+ Add to task` (`Plus` + label, dark pill, only fully visible on hover; tap-target always works on touch)
- The `IMG`/`MP4` corner badge stays top-left.

Controls fade in on hover via `opacity-0 group-hover:opacity-100`, but the More-actions dropdown stays open if open.

## More-actions dropdown — uses existing `@/components/ui/dropdown-menu`

Items: `Recreate` (Copy icon), `Add to folder` (FolderPlus, opens submenu of existing folders + "New folder…"), `Publish` (Share2), separator, `Delete` (Trash, destructive).

## Behaviors

1. **Favorite**: toggles a row in new `media_favorites` table keyed by `(user_id, media_key)` where `media_key = MediaItem.id`. Stores `url`, `kind`, `label`, `session_id`. Optimistic UI + sonner toast.
2. **Download**: triggers a `fetch → blob → <a download>` so cross-origin URLs (FAL) actually save with a filename (`<label>.jpg` / `.mp4`).
3. **Recreate**:
   - For video: re-invokes the same generation by pushing the original prompt + reference frame as a user turn into the chat (uses an `enqueue` callback on `MediaRailContext`).
   - For image: inserts a "Regenerate this frame" text + the media URL as a reference attachment into the composer; user hits send.
4. **Add to folder**: submenu lists folders from new `media_folders` table; "New folder…" prompts via a tiny inline dialog. Saves the membership in `media_folder_items`. Folder browsing UI lives in Library later — out of scope here.
5. **Publish**: copies the media URL to the clipboard via `navigator.clipboard.writeText(url)` and toasts "Public link copied". (Full share-card flow is `ShareDialog` territory; this stays scoped to the media file.)
6. **Delete**: hides the card from the Media panel by recording `(user_id, media_key)` in new `media_hidden` table; `extractMediaItems` reads a Set of hidden keys passed through context and filters them. Sonner toast with Undo (removes the row).
7. **+ Add to task**: enqueues a synthetic attachment `{ kind: "image" | "video_keyframes", name, url }` onto `MediaRailContext.pendingAttachments`. `DirectorChat` subscribes via `useEffect`, calls its existing `setAttachments(prev => [...prev, ...queued])`, then clears the queue. Toast confirms.

## Context changes — `src/components/director/MediaRailContext.tsx`

Add to the context value:
- `hiddenKeys: Set<string>` + setter (loaded from `media_hidden` per session/user)
- `favorites: Set<string>` + `toggleFavorite(item)`
- `folders: { id, name }[]` + `createFolder(name)` + `addToFolder(item, folderId)`
- `pendingAttachments: Attachment[]` + `enqueueAttachment(a)` + `consumeAttachments()`

`useMediaItems()` filters out items whose `id` is in `hiddenKeys`.

Data loading happens inside `MediaRailProvider` via a small effect that reads the three new tables once per `user.id` (and refetches on `sessionId` change for hidden keys).

## DirectorChat wiring — `src/components/director/DirectorChat.tsx`

Add a small effect: when `pendingAttachments.length > 0`, append them to local `attachments` state and call `consumeAttachments()`. Single ~6-line change near the existing handoff effect at line ~307.

## Database — single migration

```sql
-- favorites
CREATE TABLE public.media_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  label text,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_key)
);

-- folders
CREATE TABLE public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.media_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.media_folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  label text,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, media_key)
);

-- hidden / soft-deleted from panel
CREATE TABLE public.media_hidden (
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, media_key)
);
```

Each table gets the standard grants (`authenticated` full CRUD, `service_role` all) and RLS policies scoping every command to `auth.uid() = user_id`. No `anon` grants — all auth-only.

## Out of scope

- No new Library page UI for browsing folders/favorites (data is captured; views come later).
- No webhook publishing — `Publish` only copies the file URL.
- No backend re-render pipeline for `Recreate`; it routes through the existing chat send path.
- Reference media panel, plan panel, sidebar — untouched.
