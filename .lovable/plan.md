## Goal
Hide the opening assistant greeting (and any follow-up nudge bubbles that appear before the user has typed anything) once the user sends their first message.

## Where
`src/components/director/DirectorChat.tsx`

- `WELCOME` constant (line 140) and initial state `useState<Bubble[]>([WELCOME])` (line 167).
- Restore path also seeds `[WELCOME]` when a session has no messages (lines 228–229).
- The "Still there? Tell me the vibe…" line in the screenshot is not in source — it comes back from the `director-agent` LLM as an idle nudge bubble, so it lives in `bubbles` just like the welcome bubble. Treating *all leading assistant bubbles before the first user message* as intro chatter handles both in one place.

## Change
In the render loop that maps `bubbles` to UI, compute the index of the first `role === "user"` bubble. When the user has sent at least one message, skip rendering any assistant bubble whose index is **before** that first user bubble.

Pseudocode at the top of the bubbles render block:

```ts
const firstUserIdx = bubbles.findIndex((b) => b.role === "user");
const hasUserMessage = firstUserIdx !== -1;
// inside the .map((b, i) => ...)
if (hasUserMessage && i < firstUserIdx && b.role === "assistant") return null;
```

This keeps the welcome visible on a fresh/empty session (the existing behavior the user liked) and makes it (plus any pre-conversation nudges) vanish the moment the first user message is in the list.

We do **not** mutate `bubbles` state, so persistence/history sent to the agent stays unchanged — purely a render filter.

## Out of scope
- No styling changes.
- No edits to the avatar or backend.
- No change to the idle-nudge logic itself (it just won't appear once the conversation has started, which is the desired behavior).
