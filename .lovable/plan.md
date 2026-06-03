Make the resize divider between the Chat column and the Media panel visibly a line, so users can see where to drag.

## What changes

In `src/pages/Director.tsx`, inside `DirectorWorkspace`, update the `ResizableHandle` that sits between the Chat `ResizablePanel` and the Media `ResizablePanel`:

1. Replace the current transparent handle (`!w-2 bg-transparent hover:bg-transparent`) with a 1px vertical line using the existing `border` token, widened to a 2px hover/active hit zone:
   - Base: `w-px bg-border/70` (subtle hairline, matches the rest of the UI)
   - Hover/active: `hover:bg-primary/60 data-[resize-handle-state=drag]:bg-primary` for clear feedback while dragging
   - Cursor: `cursor-col-resize`
   - Keep the centered grip pill so users can grab it; restyle it to sit on top of the line with `border-border/60 bg-background/95`, and brighten on hover/drag.

2. Add a thin 8px invisible hit area around the 1px line (via `after:` pseudo-element already supported by the underlying `PanelResizeHandle`) so the line is easy to grab without making it look thick.

3. No changes to panel sizes, min sizes, `autoSaveId`, or the conditional `hasMedia` rendering — only the handle's visual treatment.

## Out of scope

- No changes to `MediaRailPanel`, `DirectorChat`, `PlanPanel`, or `MediaRailContext`.
- No changes to the left Tasks sidebar or its divider.
- No new dependencies; uses existing `react-resizable-panels` + Tailwind tokens.
