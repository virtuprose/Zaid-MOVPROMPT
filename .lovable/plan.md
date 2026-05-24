# Fix: "Extend frame-by-frame" never responds

## What's actually broken

Edge function logs from your last attempt show the smoking gun:

```
panel error 5 TypeError: The stream controller cannot close or enqueue
Http: connection closed before message completed
```

The "Extend frame-by-frame" button asks the Director for **8 continuation panels, generated sequentially** (each panel uses the previous one as a reference). At ~15–30s per image that's a 2–4 minute single HTTP stream. The proxy hangs up around panel 4–5, the edge function then crashes trying to write to the already-closed stream, and the Director turn — which is awaiting the tool result before replying — rejects with no visible message in the chat. That's why "nothing happens."

## Fix (three small, layered changes)

### 1. Parallelize the chain instead of serializing it
**File:** `supabase/functions/generate-reference-image/index.ts` (the `isChain && prompts.length > 1` block, ~lines 247–294)

Today each panel waits for the previous one so it can pass `prevPanelUrl` as a reference. But `lock_mode: "scene"` already pins the look via the original key frame (`sceneAnchor`). The prev-panel chain only adds subtle drift continuity at a huge wall-clock cost.

Switch to `Promise.allSettled` over all panels using `[sticky, sceneAnchor, ...extras]` as refs (drop `prevPanelUrl`). Stream `panel` events as each promise settles using `Promise.race` on an indexed array, or simpler: launch all, await each in order and emit when ready. Net result: ~T + overhead instead of ~N×T. Eight panels finish in ~30s, well inside the stream budget.

### 2. Make the stream survive client disconnects without crashing
Same file, same block.

- Wrap each `controller.enqueue` in `try/catch` and bail the loop on the first throw — the connection is already gone, keep generating in the background or short-circuit and refund the remainder.
- Check `controller.desiredSize === null` before enqueue.
- Add `cancel()` to the `ReadableStream` initializer that sets a flag the loop reads, so an aborted fetch refunds unspent credits instead of burning them.

### 3. Surface the failure in the chat instead of silent dead-air
**Files:** `src/lib/director/api.ts` (`generateReferenceImageStream`) and `src/components/director/DirectorChat.tsx` (the call site that consumes the stream as a tool result).

- Today if the fetch rejects mid-stream the catch path doesn't post any assistant bubble. Add a fallback: when the stream throws after `start` was received but before `done`, append a Director message like "I generated X of Y panels before the connection dropped — want me to continue from panel X+1?" with a quick-reply chip to resume.
- Also render any `panel_error` events as a small inline warning under the storyboard card so partial failures aren't invisible.

### 4. Tighten the default ask
**File:** `src/components/director/GeneratedImageCard.tsx` line 284.

Drop the default from "8 continuation beats" to "6 continuation beats." Combined with parallelism this gives a 3× safety margin on the timeout. Keep the copy otherwise identical.

## Out of scope (for this fix)

- Full async job + polling refactor (the "right" long-term shape per the timeout pattern). Worth doing later if we ever push to 12+ panels or add video stitching to the same endpoint, but the parallel + resilient fixes above resolve the user-visible bug today.
- Touching director-agent's tool-calling contract. The tool signature stays the same.

## How we'll verify

1. Click **Extend frame-by-frame** on a generated key frame.
2. Watch panels stream in within ~30–45s total.
3. Force-disconnect mid-stream (close tab, reopen) → confirm credits for unsent panels are refunded in the ledger.
4. Confirm a partial failure (e.g. one image API hiccup) shows an inline warning instead of silently dropping that panel.
