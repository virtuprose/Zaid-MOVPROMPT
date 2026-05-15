# @-mention reference files by number

Give every attachment a stable index (`@1`, `@2`, …) so the user can refer to a specific file in their brief and the agent knows which one they mean.

## UX

- Each thumbnail in the composer gets a small numbered badge in the top-left corner: `1`, `2`, … matching the order they were added. Same numbering shown on the attachment chips inside sent user messages so the conversation stays consistent.
- Typing `@` in the textarea opens a small floating picker above the caret listing the current attachments (`@1 cluster.jpg`, `@2 wellness.jpg`, …). Arrow keys + Enter to insert, Esc/click-away to dismiss. Filtering by typing after `@` (number or filename substring).
- After insertion the text contains plain `@1`, `@2` tokens. Inside rendered chat bubbles those tokens are styled as accent-colored pills so they read as references, not literal text.

## Implementation

### `src/components/director/Composer.tsx`
- Add a 1-based number badge to every thumbnail (absolute top-left, small rounded pill, accent background).
- Add an `@` mention picker:
  - Track caret position and detect when the active token starts with `@`.
  - Render a `<Popover>`-style absolute panel above the action row listing `attachments` filtered by the query after `@`.
  - On select, replace the active `@query` with `@<index> ` and close the picker.
  - Keyboard: ArrowUp/Down to move highlight, Enter/Tab to insert, Esc to close. Disable the textarea's own Enter-to-send only while the picker is open.
- Skeleton placeholders are not numbered (only resolved attachments).

### `src/components/director/DirectorChat.tsx`
- When rendering a sent user message's attachment chips, prefix each with its index (`1 · filename`) so numbering matches what the user typed.
- In the user message body, post-process the text to wrap `@\d+` tokens in a small accent pill span.

### `supabase/functions/director-agent/index.ts`
- Number attachments in the `ATTACHED REFERENCES` block (`[@1] Image: cluster.jpg`, `[@2] Voice brief transcript …`).
- Append a one-line instruction to the system prompt or to the attachment block: *"The user may refer to specific references by `@N`. Resolve those tokens to the matching reference above when reasoning."*
- Order of `imageUrls` already matches attachment order, so multimodal indexing stays consistent.

## Out of scope
- No persistence/migration changes — numbering is per-message, derived from `attachments` array order.
- No drag-to-reorder of attachments (numbering would shift; revisit later if needed).
- No autocomplete for past-message references — `@N` only resolves against the current pending attachments.
