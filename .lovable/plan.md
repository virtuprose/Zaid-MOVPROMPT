## Problem

The "Director activity" card stays visible after the agent finishes streaming and hands control back to the user (e.g. when clarifying-question chips appear). The activity panel should represent live work, not linger while the Director is idle waiting for input.

In `src/components/director/DirectorChat.tsx` (line 3370) the feed is rendered whenever `activitySteps.length > 0`, and `DirectorActivityFeed` is passed `collapsedDefault={!busy}` — so once `busy` flips to false, it just collapses instead of disappearing.

## Fix (frontend only)

**File:** `src/components/director/DirectorChat.tsx`

1. Change the render guard at line 3370 so the feed only mounts while the Director is actively working:
   - Render `<DirectorActivityFeed />` only when `busy === true` AND `activitySteps.length > 0`.
   - Drop the `collapsedDefault={!busy}` prop (no longer needed) and keep it expanded while running.
2. Clear `activitySteps` (`setActivitySteps([])`) at the moment the stream resolves / questions are surfaced — so a stale run can't reappear if `busy` briefly toggles. Reset already runs on new submit (line 1568); add a matching reset in the stream-finished branch.

No changes to the edge function, no schema/logic changes, no visual redesign — the feed simply unmounts when the Director is waiting on the user.