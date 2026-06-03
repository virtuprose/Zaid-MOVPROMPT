## Goal

Make the **expanded** tasks sidebar match the clean collapsed-rail look: just task titles as a text list, with an amber left-bar accent on the active task. Strip thumbnails, status dots, pin icons, timestamps, and the per-row "…" action button from the default view.

## Changes — `src/pages/Director.tsx` (expanded `<aside>` branch, ~lines 282-383)

Replace each task row (currently a bordered card with thumbnail + dot + pin + title + timestamp + dropdown) with a minimal text item:

- Wrapper: `<button>` (not `<div>`) → `w-full text-left px-3 py-1.5 text-xs leading-snug transition-colors`
- Inactive: `text-foreground/65 hover:text-foreground hover:bg-muted/20 border-l-2 border-transparent`
- Active: `text-accent font-semibold bg-accent/5 border-l-2 border-accent`
- Content: just `{s.title || "Untitled brief"}` with `line-clamp-2 break-words`
- Remove: thumbnail block, status dot, `Pin` icon, timestamp span, `DropdownMenu` (rename/pin/delete).

Keep:
- The "Tasks" collapsible header + chevron.
- "New Task" button at top.
- Empty state message.
- `onClick → navigate(/director/{id})`.

## Trade-off: where do edit / pin / delete go?

The current expanded list exposes rename, pin, and delete via a hover "…" menu. Removing it to match the clean aesthetic means losing that entry point.

Two options:
1. **Right-click context menu** on each task title (clean look preserved, actions still reachable). Recommended.
2. **Drop the actions entirely** from the sidebar — user manages tasks from inside the open session only.

I'll go with option 1 unless you say otherwise — wraps the button in a `ContextMenu` so right-click reveals Edit / Pin / Delete.

## Out of scope

- Collapsed rail (already done).
- Chat panel, composer, media rail.
- Sidebar header, "New Task" button styling, "Tasks" toggle.
