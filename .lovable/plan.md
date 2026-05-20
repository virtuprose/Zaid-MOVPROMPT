## Goal

Change the Director chat composer so:
- **Enter** sends the message
- **Shift+Enter** inserts a newline
- **⌘/Ctrl+Enter** keeps working as send (kept for habit)

## Changes

**`src/components/director/Composer.tsx`** (`onKeyDown` on the `<textarea>`, ~line 309):
- After the existing `@`-mention branch, replace the current `Enter + meta/ctrl` rule with:
  - If `e.key === "Enter"` and **not** `e.shiftKey` and **not** IME composition (`e.nativeEvent.isComposing` / `e.keyCode === 229`): `e.preventDefault()`, call `onSend()` if `!busy`.
  - Plain `Shift+Enter` falls through to default textarea behavior (newline).
  - Keep ⌘/Ctrl+Enter as an additional send shortcut.
- Update the hint at line ~572 from `"⌘/Ctrl + Enter to send"` to `"Enter to send · Shift+Enter for newline"`.

## Out of scope

- `QuestionCard` keeps its current `⌘/Ctrl+Shift+Enter` submit (different control, no plain-text intent there).
- No backend / state changes.
