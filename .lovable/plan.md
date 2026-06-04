## Goal
Make the task list kebab menu work reliably on every row with **Edit / Pin / Delete**, and clean up any task-list interaction issues around it.

## Plan
1. Audit the task row interaction structure in `src/pages/Director.tsx` and remove any event/trigger conflicts between the row button, the kebab trigger, and the right-click context menu.
2. Tighten the task row layout so the kebab trigger is always reachable, doesn’t get clipped, and stays visible in the correct hover/active states.
3. Ensure the dropdown actions are wired correctly:
   - **Edit** opens the rename dialog
   - **Pin / Unpin** updates row state and ordering
   - **Delete** opens the delete confirmation dialog
4. Fix any task-list rendering/styling issues that interfere with row interaction, including sidebar overflow, hit-area overlap, and active-row behavior.
5. Re-test the task list in preview and confirm the menu opens and each action behaves correctly.

## Technical details
- Likely focus area: the nested structure of `ContextMenuTrigger`, row `<button>`, and `DropdownMenuTrigger` inside each task item.
- I’ll preserve the current visual direction (`#212121` sidebar and pill-style rows) and only adjust interaction/state behavior.
- Live validation is currently blocked because the preview session lands on `/auth`; once the preview is signed in, I can verify the fix end-to-end there.