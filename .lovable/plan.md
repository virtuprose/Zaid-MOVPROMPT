
Got it. Right now `@Element 1` only highlights once the **full token** (`@Element ` + number) is typed. You want the highlight/tracking to kick in as soon as the user types `@1`, `@2`, etc. — a shorter, faster syntax that visually links to Element #1 in the grid.

## Plan

Make `@<number>` a first-class mention syntax in the prompt textarea, equivalent to `@Element <number>`.

### 1. `src/components/MentionTextarea.tsx`
- **Highlight regex**: extend the split regex to match both forms:
  `/(@Element \d+|@\d+)/g` — so `@1`, `@2` … `@10` get the same chip styling as `@Element 1`.
- **Validity check**: only highlight when the number is within `1..elements.length` (out-of-range stays plain text, so typos like `@99` don't look "valid").
- **Live picker (nice-to-have, small)**: when the caret sits right after a lone `@` with no number yet, auto-open the existing Popover so the user can pick — keeps discoverability. (Optional; include behind the same component.)
- **Insert shortcut**: change `insertMention(n)` to insert the short form `@<n> ` instead of `@Element <n> `, matching what users will type by hand. Backward-compatible: old `@Element N` strings still highlight.

### 2. `supabase/functions/generate-prompt/index.ts` (+ `experts/seedance.ts` reference-resolution prompt)
- When building the user prompt / element-reference map, normalize both `@Element N` and `@N` to the same canonical reference before sending to the model, so the AI treats them identically.
- Update the Seedance system addendum line that documents the mention syntax to mention both forms (`@1` shorthand for `@Element 1`).

### 3. i18n
- Update `elements.mentionHint` in `en.ts` / `ar.ts` to: "Type @1, @2 … to reference an element" / "اكتب @1 أو @2 … للإشارة إلى عنصر".

### Files touched
- `src/components/MentionTextarea.tsx`
- `supabase/functions/generate-prompt/index.ts`
- `supabase/functions/generate-prompt/experts/seedance.ts`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`

No DB changes, no new dependencies.
