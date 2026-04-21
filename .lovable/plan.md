

## Fix: popover/caret jumping back to `@` after typing `@1 `

### Root cause

In `SceneMentionTextarea.handleChange` the mention-picker trigger detector only checks "the character just typed was `@`". It doesn't verify that the `@` is actually at the caret as a *fresh* trigger, so two things go wrong after the user types `@1` + space:

1. **Stale `triggerPosRef`** — when the user first types `@`, `triggerPosRef` is set to that position and the popover opens. After `1` is typed, the close-branch runs (good), but `triggerPosRef` is cleared only inside that branch *if* the popover is currently open. On some keystroke orderings (fast typing, IME, or when the popover was already closed by a click-outside), `triggerPosRef` keeps pointing at the old `@`, and the next space keystroke re-enters the trigger path because `prev === "@"` is still true for the preceding `@` in `@1 ` when the caret happens to sit right after `@` (e.g. React re-rendering with the overlay/Popover anchor steals focus for one frame and the browser restores caret to `triggerPosRef` position).

2. **Popover anchor focus steal** — `PopoverAnchor` wraps the textarea; when the popover opens, the anchor's layout shift + `onOpenAutoFocus` race causes a one-frame focus loss. On reopen (triggered by the space because of #1), the browser restores caret to the last known selection, which is right after `@` — visually "jumping back to the @ tag".

### The fix

Tighten trigger detection + strictly gate reopening:

1. **Detect a real fresh `@` trigger only**, by checking that the `@` at `caret - 1` is not immediately followed by a digit *anywhere* up to the next whitespace. If `@` is already part of an existing `@N` token, never open the popover.
2. **Always clear `triggerPosRef` on any non-trigger keystroke** (not just when `open === true`), so a stale pointer can never survive into the next change event.
3. **Guard against reopening** by also requiring `!open` state before setting `open = true` — only open on the keystroke that actually introduces the lone `@`.
4. **Stop the caret-jump** by removing the `PopoverAnchor` wrapper around the textarea and switching to a virtual anchor (use `PopoverContent`'s `style`/positioning by anchoring to the textarea ref via `getBoundingClientRect`, or simply use the `PopoverTrigger` button as the anchor for the auto-opened popover too). This keeps the textarea DOM stable so focus/caret never leave it.

### Files touched

- `src/components/SceneMentionTextarea.tsx`
  - Rewrite `handleChange` trigger logic:
    - Compute `isFreshAt = prev === "@" && !/\d/.test(next[caret] ?? "") && !/\w/.test(next[caret-2] ?? "")`.
    - If `isFreshAt && !open`: set `triggerPosRef`, `setOpen(true)`.
    - Else: unconditionally clear `triggerPosRef` and close popover if it was open.
  - Replace the `PopoverAnchor`-wrapping-the-textarea pattern with keeping the anchor on the `PopoverTrigger` button; position the auto-opened popover by passing `sideOffset` and letting Radix anchor to the trigger button (which stays in the DOM). This eliminates the focus/caret race.
  - Add an `onBlur` reset that clears `triggerPosRef` when focus truly leaves the textarea.

### Out of scope
- No changes to `detectIntent` / auto Move-Lock logic.
- No changes to `MentionTextarea` (shots flow) — the bug is specific to `SceneMentionTextarea`.
- No i18n changes.

