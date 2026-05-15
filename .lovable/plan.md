# Director sidebar — recents restyle

Match the attached reference for the recents list in `src/pages/Director.tsx`. Visual restyle only — the menu items are wired as placeholders (toast "Coming soon"), no DB schema changes.

## What changes

1. **Group header** — Rename "Recent" to **"Tasks"**, render as a larger label with a chevron on the right that toggles the list open/closed (local `useState`, defaults to open). Same column width.

2. **Row style**
   - Pill-shaped (`rounded-full`), single-line, `px-3 py-1.5`, subtle border.
   - Inactive: transparent bg + `border-border/40` + `text-foreground/80`, hover lifts to `bg-muted/40`.
   - Active: `bg-muted/60` + `border-border` + `text-foreground` (matches the reference's lighter pill on the selected row).
   - Drop the `MessageSquare` icon — reference rows are text-only.
   - Title truncates with ellipsis; pill and 3-dot stay pinned to the right.

3. **"Needs reply" pill** (right of the title, before the 3-dot)
   - Shown only when the session is awaiting the user's reply, i.e. the **last message in that session was from the assistant**.
   - Compute via a single query on mount/refresh: `director_messages` grouped by `session_id`, taking the latest row's `role`. Sessions where `role = 'assistant'` get the flag. Add `needsReply: boolean` to the `SessionRow` shape kept in `Director.tsx` state.
   - Style: `text-[10px]`, `px-2 py-0.5`, `rounded-full`, `bg-accent/15 text-accent border border-accent/30` (uses existing amber accent token — matches the reference's amber tone).

4. **3-dot menu** — `MoreVertical` icon button, `size-6`, opens a shadcn `DropdownMenu`:
   - **Edit** (Pencil icon) — `toast("Rename coming soon")`
   - **Pin** (Pin icon) — `toast("Pin coming soon")`
   - separator
   - **Delete** (Trash icon, `text-destructive`) — `toast("Delete coming soon")`
   - Stop click propagation so opening the menu doesn't navigate to the session.
   - Button only visible on row hover or when its menu is open (`opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100`).

5. **Container** — Group header row uses `flex items-center justify-between` with the chevron button. List wrapper gains a smooth collapse (Tailwind `data-[state=closed]:hidden`, or simple conditional render — no animation needed to match the reference).

## Technical notes

- All work in **`src/pages/Director.tsx`**. No new files.
- New imports: `ChevronDown`, `MoreVertical`, `Pencil`, `Pin`, `Trash2` from `lucide-react`; `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` from `@/components/ui/dropdown-menu`; `toast` from `sonner`.
- Extra fetch in the existing `load()` effect:
  ```ts
  const { data: latest } = await supabase
    .from("director_messages")
    .select("session_id, role, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });
  ```
  Reduce to a `Map<sessionId, role>` keeping the first occurrence per id (latest), then merge `needsReply` into each `SessionRow`. Skip the query when `sessions` is empty.
- Active row detection (`s.id === sessionId`) and `navigate(...)` behavior unchanged.
- No DB migration, no changes to `DirectorChat`, no changes outside `Director.tsx`.

## Out of scope

- Real Edit / Pin / Delete behavior (deferred — would need a `pinned` column and a rename/delete mutation).
- Drag-to-reorder, search, or grouping by date.
- Mobile sidebar (recents list is already `hidden lg:flex`).
