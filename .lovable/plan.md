## Issue
Two PanelLeft toggle buttons appear at the top of the left side when the Tasks sidebar is collapsed:
- One inside the collapsed sidebar rail (`src/pages/Director.tsx` ~line 231)
- One absolutely-positioned over the workspace area (`src/pages/Director.tsx` ~line 522)

Both call the same `toggleNav` handler, so they're duplicates.

## Fix
Keep a single toggle and remove the duplicate. The cleaner option is to keep the **workspace toggle** (line 522) because:
- It stays in the same spot whether the sidebar is collapsed or expanded (so users always know where to find it).
- The expanded sidebar currently has no toggle at all — the workspace button already serves both states.
- Removing the in-rail toggle in the collapsed view eliminates the visual duplication shown in the screenshot.

### Change
In `src/pages/Director.tsx`, remove the collapsed-rail `PanelLeft` toggle (the Tooltip + button wrapping `toggleNav` with aria-label "Expand tasks sidebar") so only the workspace-level toggle remains. The "+" New task button and task thumbnails below it stay unchanged.

## Result
One single sidebar toggle pinned at the workspace's top-left, working consistently in both collapsed and expanded states.