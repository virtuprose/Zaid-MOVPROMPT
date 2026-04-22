

## Auto-reset Move/Lock badges when Describe text is cleared

When the user empties the Describe textarea (post-Analyze), every element that hasn't been manually toggled resets to the default `move` action. Manually overridden elements stay as the user left them.

### Change

In `src/components/WorkflowPanel.tsx`, the existing auto-assign `useEffect` that watches `description`:

- At the top of the effect, check `description.trim() === ""`.
- If empty: build a new `elementDirections` map where every element id whose `manualOverrides[id]` is **not** `true` is set back to `{ action: "move", note: prevNote ?? "" }`. Preserve existing notes and preserve any manually-overridden actions untouched.
- Call `setElementDirections(next)` and `return` early so the verb-detection branch doesn't run on empty text.
- Leave the rest of the effect (verb scanning) unchanged for the non-empty case.

### Behavior

- Type a sentence with "lock" / "move" verbs → badges auto-assign as today.
- Manually click a badge to flip it → that element is marked overridden and won't be touched by auto logic.
- Clear the textarea → all non-overridden badges snap back to `move`; overridden badges stay.
- Scene frames, elements, notes, and references are untouched.

No UI, translations, or other files change.

