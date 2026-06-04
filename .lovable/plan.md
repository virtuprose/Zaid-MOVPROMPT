## Goal
Match the attached screenshot for the Tasks sidebar in AI Director.

## Changes (in `src/pages/Director.tsx`)

1. **Background color** — change expanded sidebar bg from `hsl(240 6% 9%)` to `#212121`.
2. **Task row styling** — give each task item a pill look:
   - Rounded (`rounded-lg`), horizontal padding, no left border accent.
   - Hover/active background: subtle lighter overlay (`bg-white/5` hover, `bg-white/10` active).
   - Active text stays accent-tinted but without the left border bar.
3. **Kebab menu per row** — add a `MoreVertical` button on the right of each task row, visible on hover or when active. Clicking opens a `DropdownMenu` with the same actions currently in the right-click `ContextMenu` (Edit, Pin/Unpin, Delete). Right-click context menu stays as a bonus.
4. **Tasks header** — keep "Tasks" label + chevron; small visual polish to align with screenshot (slightly muted, same font size).

## Out of scope
- No logic changes to rename/pin/delete handlers.
- No changes to collapsed sidebar, chat, or media rail.
