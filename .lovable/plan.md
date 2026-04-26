## Why you're getting 5 shots from 9 elements

After tracing the request flow, I found two compounding bugs — not an AI hallucination.

### Root cause #1 — Shot count is hard-coded by the model contract, not by your uploads

In `src/lib/modelContracts.ts`, every multishot model has a fixed `multiShotCount` (e.g. **3**, **5**, or **10**). In `src/components/WorkflowPanel.tsx` (line 518) the client sends exactly that number to the edge function:

```
multiShotCount: contract.multiShotCount   // e.g. 5, regardless of how many elements you uploaded
```

Then in `supabase/functions/generate-prompt/index.ts` (line 411):

```
userText += ` Generate EXACTLY ${resolvedShotCount} shot${...} in the results array.`;
```

So when your active model's contract says `multiShotCount: 5` and you upload 9 elements, the AI is **explicitly instructed to return 5 shots**. That's why you see 5 — it's doing exactly what we told it.

### Root cause #2 — No output-token cap, so big payloads can silently truncate

The AI gateway call in `buildAiBody` (line 496) doesn't pass `max_tokens` / `maxOutputTokens`. With 9 elements + 9 long shot scripts wrapped in a tool call, Gemini hits its default output limit and either drops trailing array entries or returns malformed JSON that we then fail to parse fully. This is the classic truncation pattern called out in the Lovable docs (raise `max_tokens` for long structured output).

---

## The fix

### 1. `supabase/functions/generate-prompt/index.ts`
- **Auto-scale shot count to elements** when the user is in `multishot` and uploaded ≥ 3 elements: `resolvedShotCount = clamp(elements.length, 3, 10)` so 9 elements → 9 shots, 4 → 4, etc. Still respect an explicit `multiShotCount` from the client when it's higher than the element count (so the contract's cap can still expand it).
- **Add `max_tokens: 16000`** to `buildAiBody` so the tool call has enough room for 10 detailed shots without truncation.
- **Add a post-parse safety check**: if `parsed.results.length < resolvedShotCount`, log a warning and append a `modelNotes` note on the last shot saying generation was truncated, so the bug surfaces visibly instead of silently.

### 2. `src/components/WorkflowPanel.tsx`
- When the user uploaded `elements` (Seedance @Element flow) and we're in multishot, pass `multiShotCount: max(contract.multiShotCount ?? 0, elementsPayload.length)` so the client's request matches what they expect (one shot per uploaded element, capped at 10).

### 3. `src/lib/modelContracts.ts`
- No structural change. The 3/5/10 values stay as defaults for the *no-element* case.

### 4. Verify
- Redeploy `generate-prompt`.
- Test with `supabase--curl_edge_functions` simulating 9 elements and confirm the response has 9 entries in `results` (or a clear truncation note if the AI still capped out).
- Spot-check edge-function logs for the new warning.

### Files to edit
- `supabase/functions/generate-prompt/index.ts`
- `src/components/WorkflowPanel.tsx`

After this, uploading N elements (3 ≤ N ≤ 10) gives you N shots, and oversized payloads no longer get silently truncated.