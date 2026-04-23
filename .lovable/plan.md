

## Seedance 2.0: return only ONE detailed prompt

**Problem:** Seedance 2.0 / 2.0 Fast currently returns multiple result cards that look like duplicates. Cause: the model interprets the multi-cut "shooting script" structure in the Seedance system prompt as multiple `results[]` entries. The response schema doesn't cap the array length, so 4–6 near-identical entries flow through to the UI.

**Scope:** Only Seedance 2.0 and 2.0 Fast (single-image workflow, no multi-shot toggle). All other models — including Seedance Pro / Pro Fast multi-shot (5 stitched shots) and Any-Model multi-shot (10 variants) — keep current behavior.

### Change (single file: `supabase/functions/generate-prompt/index.ts`)

**1. Add an instruction clause** right after line 414, before building `userContent`:

```ts
const isSeedance20 = targetModel === "seedance-2.0" || targetModel === "seedance-2.0-fast";
if (isSeedance20 && workflowType !== "multishot") {
  userText += ` Return EXACTLY ONE entry in the results array. The full shooting script — every sequence block and numbered cut — lives INSIDE the single mainPrompt of that one entry. Do NOT split cuts into separate results.`;
}
```

**2. Defensive trim after parse** (right after line 542):

```ts
if (isSeedance20 && workflowType !== "multishot" && Array.isArray(parsed.results) && parsed.results.length > 1) {
  parsed.results = parsed.results.slice(0, 1);
}
```

That's the entire change — ~6 lines added, surgically gated to Seedance 2.0 single-workflow only. No other model, no schema-wide changes, no client changes.

### Out of scope

- No edit to `experts/seedance.ts` (keeps the rich shooting-script format intact).
- No change to Seedance Pro multi-shot (still emits 5 stitched shots).
- No change to Any-Model multi-shot (still emits 10 variants).
- No change to Kling, Veo, or other specialist agents.
- No client / UI changes.

### Verification

1. Seedance 2.0 + 1 image → exactly **1** result card with the full multi-cut shooting script inside its `mainPrompt`.
2. Seedance 2.0 Fast + @Element references → exactly **1** result, all `@Element N` tokens preserved inside the single `mainPrompt`.
3. Seedance Pro + multi-shot toggle (5 shots) → still **5** distinct result cards.
4. Any-Model + multi-shot (10) → still **10** results.
5. Kling 3.0 / Veo 3.1 single-frame → unchanged, 1 result as before.

