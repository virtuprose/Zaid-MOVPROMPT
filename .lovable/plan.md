## Goal

The "Still there? Tell me the vibe…" idle nudge currently stays in the chat after the user finally types and hits Enter. It should disappear the moment they send, so only their first real message and the Director's reply remain.

## Change

In `src/components/director/DirectorChat.tsx`:

1. In the send handler (the function that fires on Enter / send button before appending the user bubble), filter the existing `bubbles` state to drop any assistant bubble whose `content === IDLE_NUDGE`. Apply the filter in the same `setBubbles` call that appends the new user bubble, so it's a single atomic update with no flicker.
2. Cancel any pending idle nudge: clear `idleTimer.current` and set `idleNudgedRef.current = true` at the top of the send handler so a queued nudge can't fire mid-send.
3. Leave the existing 45s idle-nudge effect untouched — it already self-suppresses once `idleNudgedRef.current` is true or `input`/`attachments` are non-empty.

No backend, no styling, no credit/approval changes. Pure frontend bubble cleanup.

## Out of scope

- The opening "Hey — I'm your Director…" welcome bubble stays.
- No change to how/when the nudge first appears.
