

## Fix `@mention` insertion bug in Describe box

When picking an element from the `@` popover in either Describe textarea (initial or post-Analyze), the wrong text is inserted — usually a duplicated `@` (like `@@1`), the token jumps to the start of the textarea, or nothing usable happens. This affects both `MentionTextarea` and `SceneMentionTextarea`.

### Root cause

Clicking a popover item moves focus away from the `<textarea>`. Two bugs follow:

1. In `SceneMentionTextarea`, the textarea's `onBlur` clears `triggerPosRef` **before** `insertMention` runs. The `@` is never replaced, so we fall into the "insert at caret" branch — but `selectionStart` is now stale/0, so the token lands in the wrong place.
2. In both components, `selectionStart` after blur is unreliable. We need to capture caret + trigger position **before** focus leaves, and use those snapshots inside `insertMention`.

### Fix

**`src/components/SceneMentionTextarea.tsx`**
- Add a `lastCaretRef` that records `selectionStart` / `selectionEnd` on every `onSelect`, `onKeyUp`, `onClick`, and `onChange` of the textarea.
- Remove the `onBlur` that nukes `triggerPosRef`. Instead, keep `triggerPosRef` alive while the popover is open and only clear it in `handleOpenChange(false)` after the insert has happened.
- In `insertMention`, prefer `triggerPosRef.current` first; if absent, fall back to `lastCaretRef.current` (not the live `selectionStart`, which is 0 after blur).
- Make popover item buttons use `onMouseDown={(e) => e.preventDefault()}` so the textarea never blurs, then call `insertMention` on `onClick`. This keeps focus and the caret intact.

**`src/components/MentionTextarea.tsx`**
- Same three changes: add `lastCaretRef`, switch popover item buttons to `onMouseDown` preventDefault + `onClick` insert, and have `insertMention` fall back to `lastCaretRef` when `triggerPosRef` is null.
- Tighten `handleChange` so the trigger position is only cleared when the user actually destroys the `@` (deletes it or types a digit), not on every keystroke.

### Verification
- Type `@` → popover opens → click item → token replaces the `@` at the correct spot, with caret placed after the inserted `@N `.
- Click the pill button (no inline `@`) → token is appended at the current caret, not at position 0.
- Works the same in both initial Describe (with element references) and post-Analyze Describe (with scene mentions).

No translations, styles, or other components change.

