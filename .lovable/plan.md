

## Fix `@N` mention → Move/Lock badge for all numbers

Today the auto-assign only flips the badge for the **first** `@N` after a verb. Saying *"lock @1 and @2 and @3"* sets only @1 to Lock; @2 and @3 stay on Move. Verbs after a long gap, or numbers mentioned without a nearby verb, also get missed. And once a badge is auto-set to Lock, removing the verb but keeping `@N` leaves it stuck on Lock.

### Root causes (in `src/lib/sceneIntent.ts` and the auto-assign effect)

1. The segment for each `@N` stops at the next `@M`. So verbs that appear **before** a chain like `@1 @2 @3` only land on the first mention — the next mentions have no verb in their bounded window.
2. Conjunction chains (`@1 and @2`, `@1, @2, @3`) aren't recognized as sharing the verb of the lead mention.
3. The effect only writes when `intent` is non-null — if the user removes the verb but leaves `@N`, the previous Lock/Move sticks instead of falling back to default `move`.

### Fix

**A. Smarter intent detection (`src/lib/sceneIntent.ts`)**
- Keep the current per-mention window scan, but also implement **chain inheritance**:
  - Walk the text once, tokenized. When a verb (Move or Lock, with negation) is found, it "owns" the next mention `@N` within ~12 tokens.
  - If that owned mention is followed by a connector chain (`and`, `&`, `,`, `+`, `with`, `plus`, Arabic `و`, `،`) and another `@M` with no intervening verb, `@M` inherits the same intent. Repeat across the chain until a non-connector / new verb breaks it.
- Also support the reverse pattern *"@1, @2, @3 are locked"* — if a chain of mentions is followed (within ~6 tokens) by a verb with no other verb in between, apply that verb to all mentions in the chain.
- Export a single helper `detectAllIntents(text, maxIndex): Record<number, "move"|"lock">` that returns intents for every `@N` in one pass. Keep `detectIntent` as a thin wrapper for back-compat (looks up in the map).

**B. Reset stale badges (`src/components/WorkflowPanel.tsx`, the effect at lines 130–167)**
- Replace the per-element loop with one call to `detectAllIntents(description, flatSceneElements.length)`.
- For every non-overridden element:
  - If the map has an entry → set that intent.
  - If the map has **no** entry (verb removed, or `@N` never typed) → reset to default `"move"` so the badge isn't stuck on a stale Lock.
- Keep the 150ms debounce, the `manualOverrides` skip, and the empty-text branch as-is.

**C. Smoothness**
- Keep debounce at 150ms (already smooth).
- Continue using the functional `setElementDirections((prev) => …)` with the `changed` short-circuit so unchanged states don't re-render and don't restart pulse animations in `SceneBreakdown`.

### Verification
- `"lock @1 @2 @3"` → all three become Lock.
- `"@1, @2 and @3 move"` → all three become Move (reverse chain).
- `"keep @1 still, @2 walks, @3 stays"` → @1 Lock, @2 Move, @3 Lock.
- `"don't move @1"` → @1 Lock (negation, unchanged behavior).
- Type `"lock @1"` → @1 Lock; delete the word `lock` (keep `@1`) → @1 returns to Move.
- Manually flipped element stays manual regardless of text changes (unchanged).
- Clearing the textarea still resets all non-overridden to Move (unchanged).

### Files touched
- `src/lib/sceneIntent.ts` — add chain inheritance + reverse pattern + `detectAllIntents`.
- `src/components/WorkflowPanel.tsx` — switch the effect to use `detectAllIntents` and reset to `move` when a mention has no intent.

No UI, translations, or other components change.

