
## @-mention elements in the scene breakdown description

After scene analysis, number each detected element and let the user @-mention them in the description box. Mentions are highlighted inline; "Skip → Generate" path stays exactly as today.

### What the user sees

1. User uploads image → clicks **Analyze Scene** → analysis returns frames + elements (already works).
2. In `SceneBreakdown`, each element now shows a prominent **@N** badge (N = 1-based index across all elements, stable left-to-right, frame-by-frame).
3. Below the breakdown, the description field becomes a **mention-aware textarea** with:
   - A hint row: *"Tip: type `@` to reference a specific element (e.g. `@2 should slowly turn toward camera`)."*
   - Inline highlighting: any `@N` that matches a real element is rendered with a colored pill (primary tint) in an overlay layer behind the textarea.
   - Autocomplete: typing `@` opens a small popover listing elements (`@1 — subject: woman in red coat`, `@2 — midground: wooden table`, …). Arrow keys + Enter insert; Esc closes.
   - A chip row above the textarea with clickable `@1 @2 @3 …` chips as a fallback for users who don't want to type `@`.
4. On **Generate**, mentions are resolved server-side into explicit element references so the model knows which element the user is talking about.
5. If the user clicks **Skip**, nothing changes — description stays a plain textarea, no mentions, identical to today.

### Technical changes

**1. New component — `src/components/MentionTextarea.tsx`**
- Wraps `Textarea` + an absolutely-positioned overlay `<div>` that mirrors content and highlights `@N` tokens matching known elements.
- Props: `value`, `onChange`, `elements: { index: number; label: string; category: string }[]`, `placeholder`.
- Popover (shadcn `Popover` + `Command`) triggered when caret is right after `@` with optional digits; filters by number or label.
- Insert rule: inserts `@N ` (with trailing space). Regex for highlight: `/(^|\s)@(\d+)\b/g`.
- Accessible: `aria-autocomplete="list"`, keyboard nav handled in `onKeyDown`.

**2. `src/components/SceneBreakdown.tsx`**
- Flatten frames into a single indexed list; pass `globalIndex` (1-based) to each element.
- Render a `@{globalIndex}` badge on each element card (mono font, primary color, same chip style already used elsewhere).
- Add a "Click to insert" click handler on each badge that emits `onInsertMention(n)` up to `WorkflowPanel`.
- New prop: `onInsertMention?: (n: number) => void`.

**3. `src/components/WorkflowPanel.tsx`**
- In the `breakdown → generate` phase, when `sceneFrames` exist, replace the current description `<Textarea>` with `<MentionTextarea elements={flatElements} … />`.
- Maintain `flatElements` = `sceneFrames.flatMap(f => f.elements).map((el, i) => ({ index: i+1, label: el.description, category: el.category }))`.
- Pass `onInsertMention` to `SceneBreakdown` → appends `@N ` to description state.
- Skip path unchanged: if user clicks **Skip**, we render the existing plain `<Textarea>` (no elements context) exactly as today.
- Build a `mentions` array before calling `generate-prompt`:
  ```ts
  const mentions = Array.from(description.matchAll(/(?:^|\s)@(\d+)\b/g))
    .map(m => Number(m[1]))
    .filter(n => n >= 1 && n <= flatElements.length);
  ```
  Pass `mentions` + `flatElements` in the `generate-prompt` payload under a new `elementMentions` field (array of `{ index, category, description, note? }`).

**4. `supabase/functions/generate-prompt/index.ts`**
- Accept optional `elementMentions: { index: number; category: string; description: string }[]`.
- If present, append a block to the user prompt:
  ```
  User @-mentioned these specific elements in their directive. Treat each @N as a direct reference to the listed element and apply the user's wording to THAT element only:
  @1 — {category}: {description}
  @2 — {category}: {description}
  …
  ```
- No schema/output changes.

**5. i18n — `src/i18n/translations/en.ts` + `ar.ts`**
- `elements.mentionHint` → *"Type @ to reference an element (e.g. @2 turn toward camera)"* / Arabic equivalent.
- `elements.mentionPickerTitle` → *"Insert element reference"* / Arabic.

### Out of scope
- Persisting mentions in prompt history differently (they're already captured as plain text in the description).
- Mention support in the `Skip → Generate` plain textarea (explicit user request: unchanged).
- Renumbering after manual element deletion (not a current feature).

### Files touched
- `src/components/MentionTextarea.tsx` *(new)*
- `src/components/SceneBreakdown.tsx`
- `src/components/WorkflowPanel.tsx`
- `supabase/functions/generate-prompt/index.ts`
- `src/i18n/translations/en.ts`, `src/i18n/translations/ar.ts`
