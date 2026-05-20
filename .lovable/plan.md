# Free scroll + safe navigation during story render

Two small, focused changes in the Director chat. No backend changes — render jobs already run server-side and survive navigation.

## 1. Stop hijacking the scroll while acts are rendering

Today `DirectorChat.tsx` (lines 308–310) force-scrolls to the bottom on every `bubbles` change. Because `ActStrip` polls every 4s and pushes new bubble state via `onActsUpdate`, the chat yanks itself back to the bottom every 4 seconds while you try to read older messages.

Fix in `src/components/director/DirectorChat.tsx`:

- Track whether the user is currently "pinned to bottom" using a ref (`isAtBottomRef`).
- Update it on the scroll container's `onScroll` (threshold: within ~80px of the bottom).
- Only call `scrollTo({ top: scrollHeight, behavior: "smooth" })` when `isAtBottomRef.current === true`.
- When the user has scrolled up and new content arrives, show a small floating "Jump to latest" pill (bottom-center of the scroll area) that scrolls to bottom and re-pins. Hide it when pinned.
- Keep the existing scroll-to-bottom on first mount / when a fresh user message is sent (force scroll in those two cases regardless of pin state).

Result: while 4 Seedance acts are rendering you can freely scroll up to re-read the brief, location pick, or earlier bubbles. A pill appears if you want to jump back.

## 2. Make leaving the tab safe (no lost progress)

Render survival is already mostly correct: Seedance jobs run server-side, `handleActsUpdate` persists the `acts` array to `director_sessions.messages` on each poll tick, and `ActStrip` resumes polling when the session is reopened. The remaining gaps:

- The route loader at lines 211–230 keeps the local copy if it's longer than the server copy. After navigating back the local cache may be stale (jobs that finished while away). Change the merge so `story_render` bubbles always take the server's `acts` snapshot when the server version has more `completed`/`failed` acts than the cached one. Other bubble kinds keep current behavior.
- Add a `visibilitychange` + `focus` listener that re-runs the existing video-job / acts poll once when the tab/page becomes visible again, so the strip refreshes immediately instead of waiting up to 4s.
- Persist the `acts` snapshot on `beforeunload` / route change (call `persist(bubbles, null, null)` synchronously when `DirectorChat` unmounts if there are any `queued`/`processing` acts). This protects against an unmount happening mid-poll-tick before the latest update was saved.

No changes to `story-render`, `story-stitch`, `director-agent`, or the database schema. No changes to the sidebar/`Director.tsx`.

## Files touched

- `src/components/director/DirectorChat.tsx` — pinned-scroll logic, "Jump to latest" pill, smarter server-merge for `story_render`, visibility/focus re-poll, unmount-persist.
- `src/components/director/ActStrip.tsx` — minor: expose a manual `refresh()` (or accept a `refreshSignal` prop) so the parent's visibility listener can trigger an immediate poll.

## Out of scope

- Background push notification when a render finishes (could come later).
- Multi-tab sync of the same session.
