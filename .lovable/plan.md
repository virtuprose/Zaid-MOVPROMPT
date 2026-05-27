## Goal
Show a small timestamp on each chat message in the Director panel — both the user's input and the Director's reply — so it's clear when each message was sent.

## Scope
- User text bubbles (`role: "user"`) — timestamp below the message, right-aligned.
- Assistant text bubbles (`role: "assistant"`) — timestamp below the message, left-aligned under the avatar.
- Skip card-style bubbles (results, questions, model_choice, video, etc.) for now — those already have their own internal chrome and would look noisy. Easy to extend later if you want.

## Display
- Format: `HH:MM` in the user's locale (e.g. `22:31` or `10:31 PM`).
- Tooltip on hover shows full date + time.
- Subtle styling: `text-[10px] text-muted-foreground/60` so it doesn't compete with content.

## Implementation

### 1. Add `ts` to the Bubble type
`src/components/director/DirectorChat.tsx` — extend each Bubble variant with optional `ts?: number` (epoch ms). Optional so old persisted sessions don't break.

### 2. Stamp on creation
Set `ts: Date.now()` at every site that constructs a `user` or `assistant` Bubble. Search confirms the create-sites:
- user bubbles: lines ~1113, ~1231 (and any I missed via grep).
- assistant bubbles: WELCOME, the streaming placeholder, error/result-related assistant lines.
For loaded-from-storage bubbles that have no `ts`, fall back to `undefined` (no timestamp shown — better than fake-now).

### 3. Render
In the render loop (~line 2763 user branch, ~2768 assistant branch), append a tiny `<time>` element after `MessageContent`:
```tsx
{b.ts && (
  <time
    dateTime={new Date(b.ts).toISOString()}
    title={new Date(b.ts).toLocaleString()}
    className="text-[10px] text-muted-foreground/60 mt-0.5 block"
  >
    {new Date(b.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
  </time>
)}
```
Right-align under user bubble (matches the bubble alignment), left-align under assistant.

### 4. Persistence
`src/lib/director/localState.ts` already serializes bubbles as `any` — no schema change needed; `ts` rides along automatically.

### 5. RTL
Locale-aware `toLocaleTimeString` handles Arabic numerals when the page is in `ar` locale. No extra i18n strings needed.

## Out of scope
- Date separators ("Today", "Yesterday") between bubbles.
- Read receipts / "Director is typing at …" timestamps.
- Backfilling timestamps for messages already in localStorage (will simply show nothing for those, which is honest).

## Verification
- Send a new message — both the user bubble and the Director reply show `HH:MM` underneath.
- Hover the timestamp — tooltip shows full date.
- Reload — new messages still carry their original times; pre-existing ones show no timestamp.
