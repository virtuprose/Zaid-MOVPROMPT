## Goal

Replace the current **Describe** chip + Popover with an **inline text input** that sits on the same row as the Brand (Bose/MovPrompt) and Avatar (Liam/Maya) chips. The user clicks once and types directly — no popover, no separate textarea modal — exactly like the attached screenshot where "create ad video" is typed inline after the chips.

## Behavior

- The input is borderless, transparent, and lives flush next to the chips in the same flex row.
- Placeholder: `Describe your ad…` (muted, italic optional).
- Auto-grows in width to fill remaining row space (`flex-1 min-w-[160px]`).
- Stores its value in the existing `userNote` state — no new state, no new prop.
- Same 280-char cap, same downstream behavior (passed to `writeAdScene` and `composeStudioPrompt` as the adaptation layer).
- A small `×` clear affordance appears only when the field has content, aligned to the right edge of the input.
- No popover, no Pencil icon, no dashed pill — the input itself communicates "type here".

## File touched

- `src/pages/MarketingStudio.tsx` — replace lines ~709–764 (the `<Popover>…</Popover>` block) with an inline `<input>` (or single-line `Textarea` styled as input) bound to `userNote`. Remove now-unused `Popover` / `PopoverTrigger` / `PopoverContent` / `Pencil` imports if no longer referenced elsewhere on the page (verify first).

## Out of scope

- No change to the brand/avatar chips, Format/Location row, Generate button, or any backend logic.
- No persistence change — still ephemeral component state.
- Edge function (`write-ad-scene`) and `composeStudioPrompt` already handle `userNote` correctly; untouched.
