# Stable, renameable references for media items

## Problem today
- In the Composer, `@1`, `@2`, … are just positional shortcuts into the *current message's* attachments. They get re-resolved into the actual image URL at send-time, so the Director sees the right image *for that turn*.
- Every new generation produces fresh items in the Media Rail (`Key frame`, `Panel 1`, etc.) and the numbering restarts. There is no persistent handle the user can type to point back at an older image.
- Result: the user has to reopen the picker and re-pick from the rail every time, and the Director can't reliably tie "make @1 brighter" across turns.

## Goal (option B)
Let the user **rename / pin** any item in the Media Rail (e.g. `hero-bottle`, `model-closeup`). Those named items become **stable references** that:
1. Survive new generations.
2. Show up first in the Composer `@` picker, with their custom name as the token (e.g. `@hero-bottle`) instead of a positional number.
3. Resolve to the same image URL every time, so the Director sees the same pixels whenever the user types that handle.

## UX

**Media Rail card** — add a "Rename" action to the existing kebab menu next to "Favorite / Add to folder / Hide". Opens a small dialog with a single text field (lowercased, kebab-cased, max 32 chars, must be unique per user).

**Composer `@` picker** — show two sections:
- **Pinned references** (user's named items, sorted alphabetically) — token is `@name`.
- **This message** (current attachments, today's behavior) — token stays `@1`, `@2`, …

Typing `@he` filters across both. Selecting a pinned reference inserts `@hero-bottle ` and, on send, the client attaches the corresponding image URL to the outgoing message the same way it already does for `@N`.

**Visual treatment** — pinned tokens render in the bubble (DirectorChat line 2947 area) with the same accent chip but show the name instead of the number.

## Technical plan

### 1. Schema (one new table)
`public.media_labels` — per-user custom name → media URL.

```
id uuid pk, user_id uuid, name text, media_key text, kind text,
url text, label text (original label), session_id uuid null,
created_at timestamptz default now(),
unique (user_id, name)
```
RLS: owner-only CRUD. Standard GRANTs to `authenticated` + `service_role`.

### 2. MediaRailContext
- Load labels alongside favorites/folders.
- Add `renameItem(item, name)` and `unnameItem(name)` (upsert/delete in `media_labels`).
- Expose `pinnedRefs: { name, url, kind, label }[]`.

### 3. MediaCard (MediaRailPanel)
- New "Rename" menu item → opens dialog (reuse the existing `New folder` dialog pattern).
- If the item already has a name, the menu shows "Rename (@current-name)" and adds a "Remove name" entry.
- Small chip on the card itself: `@hero-bottle` when named.

### 4. Composer `@` picker
- Add `pinnedRefs` from `useMediaRail()` to `filteredMentions`.
- Adjust `insertMention` to accept either an attachment index (`@N`) or a pinned ref (`@name`).
- On send, resolve any `@name` tokens in `value` against `pinnedRefs` and append the resolved URL as an extra `Attachment` (role: `reference`) on the outgoing message — mirrors how `@N` already flows.
- Token regex bumps from `/@\d+/` → `/@(?:\d+|[a-z0-9][a-z0-9-]{0,31})/`.

### 5. Render in DirectorChat
- Update the `@\d+` split (line 2947 and 660) to the new regex so named tokens get the accent chip styling too.

### 6. Validation
- Names: `^[a-z0-9][a-z0-9-]{0,31}$`. Reject reserved words (`art`, `ref`, `me`).
- Dialog shows live validation + uniqueness check on blur.

## Out of scope
- Auto-naming (Director suggesting names) — can come later.
- Cross-session references for non-rail items.
- Editing the name of a *generation* itself in the rail (we name the reference handle, not the underlying image).
