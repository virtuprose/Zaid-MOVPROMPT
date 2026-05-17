# Plan — Local persistence for Director chat

## Goal
When a user reloads `/director` or `/director/:id`, restore the in-progress chat bubbles, composer input, and staged attachments from the previous session — without waiting for the Supabase round-trip. Server persistence (already in place via `director_sessions`) remains the source of truth for completed turns; localStorage is the immediate, per-tab safety net.

## Scope
- `src/components/director/DirectorChat.tsx` — read/write local state on every change; hydrate on mount; clear on reset.
- New `src/lib/director/localState.ts` — small typed helper (`load`, `save`, `clear`) with a versioned key.

Out of scope: changing the Supabase schema, persisting partial agent stream states, syncing across tabs.

## Storage shape
Key: `director:state:v1:<scope>` where `<scope>` is either `routeSessionId` or the literal `"new"` for an unsaved brief.

Value (JSON):
```
{
  v: 1,
  savedAt: number,           // Date.now()
  sessionId: string | null,  // sessionIdRef
  bubbles: Bubble[],         // full conversation array
  input: string,             // current composer text
  attachments: Attachment[]  // staged but unsent references
}
```

Bubbles and attachments are already JSON-serialisable (attachments hold `url` / `storage_path` strings, no `File` objects), so `JSON.stringify` round-trips cleanly.

## Hydration rules
On mount of `DirectorChatInner`:
1. Compute the scope key from `routeSessionId ?? "new"`.
2. If a saved blob exists and is < 7 days old, set `bubbles`, `input`, `attachments`, and `sessionIdRef` from it before the existing Supabase load effect runs.
3. The existing Supabase fetch (when `routeSessionId` is present) still runs; if it returns a newer `messages` array (compare length or last updated_at), it overrides the local copy. Otherwise the local copy is kept so the user doesn't see a flicker.
4. If parse fails, silently clear the entry.

## Save rules
Debounced (250 ms) write whenever `bubbles`, `input`, or `attachments` change and the component is not in the empty welcome state. Skip writes while `busy` mid-stream to avoid storing the `"…"` placeholder — flush once on completion.

## Clear rules
- `startFresh()` removes the entry for the current scope and the `"new"` scope.
- After `persist()` successfully assigns a new `sessionIdRef`, migrate the `"new"` entry to the new session-scoped key so a subsequent reload on `/director/:id` finds it.
- Quota errors are caught and ignored (oversized attachment payloads fall back to no-persist for that turn).

## Edge cases handled
- Attachments referencing object URLs (`blob:`) won't survive a reload — strip those before save and replace with a placeholder badge on restore so the chip still renders but is marked "re-upload to use".
- Different users on the same browser: include `user.id` in the scope key (`director:state:v1:<uid>:<scope>`) and clear all entries on sign-out.
- SSR / no `window`: guarded by `typeof window !== "undefined"`.

## Technical notes
- No new dependencies. Pure `useEffect` + `localStorage`.
- Total stored payload capped (e.g. 1 MB) by truncating oldest bubbles if exceeded.
- Versioned key (`v1`) lets us bump and discard stale shapes later.
