

## Confirm before auto-resetting badges on Describe clear

When the user empties the Describe textarea and at least one element is currently auto-assigned (not in `manualOverrides`) with a non-default state (`lock`, or `move` with a note), show a confirmation dialog before wiping the badges. Manually overridden elements are never touched, so they don't count toward the prompt.

### Behavior

- User clears Describe → effect detects `description.trim() === ""`.
- Compute "at-risk" elements: non-overridden elements whose current `elementDirections[id].action === "lock"` **or** whose `note` is non-empty.
  - If zero at-risk → reset silently as today (no dialog, no Undo snapshot needed).
  - If ≥1 at-risk → open an `AlertDialog` asking the user to confirm.
- Dialog actions:
  - **Reset badges** (destructive): performs the existing reset, captures the Undo snapshot (existing behavior), closes dialog.
  - **Keep them** (cancel): closes dialog, leaves `elementDirections` untouched. No snapshot, no Undo row.
- If the user types again into Describe while the dialog is open, auto-dismiss the dialog (the reset is no longer relevant).
- The dialog only appears once per "clear event" — after the user decides, it won't re-prompt until they type something and clear again.

### UI

Use existing `AlertDialog` from `src/components/ui/alert-dialog.tsx` (already in the project, matches dark cinematic theme). Rendered inside `WorkflowPanel`, controlled by local state.

```
Reset element badges?
You have N element(s) with custom Move/Lock or notes that
weren't set manually. Clearing the description will reset them
to default Move.

[ Keep them ]   [ Reset badges ]
```

### Implementation outline (`src/components/WorkflowPanel.tsx`)

1. New state:
   - `const [confirmResetOpen, setConfirmResetOpen] = useState(false);`
   - `const [pendingResetCount, setPendingResetCount] = useState(0);`
2. Refactor the existing empty-text branch of the auto-assign `useEffect`:
   - Compute `atRisk = flatSceneElements.filter(el => !manualOverrides[el.id] && (elementDirections[el.id]?.action === "lock" || (elementDirections[el.id]?.note ?? "") !== ""))`.
   - If `atRisk.length === 0` → run the existing silent reset path (with snapshot+Undo only if anything actually changed, same as today).
   - If `atRisk.length > 0` → set `pendingResetCount = atRisk.length`, `setConfirmResetOpen(true)`, and **return early** without touching state.
3. Extract the current reset logic into a helper `performAutoReset()` that builds `next`, sets `elementDirections`, and starts the Undo snapshot timer.
4. Confirm handler → `performAutoReset(); setConfirmResetOpen(false);`
5. Cancel handler → `setConfirmResetOpen(false);` (no state mutation).
6. In the non-empty branch (top of effect), if `confirmResetOpen` is true, close it (`setConfirmResetOpen(false)`) — typing supersedes the dialog.
7. Cleanup: close dialog on unmount and on `phase` change away from `generate`.
8. Render `<AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>` near the existing Undo row, with translated title/description/actions.

### Translations

Add to `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts`:

| Key | EN | AR |
|---|---|---|
| `wp.confirmReset.title` | `Reset element badges?` | `إعادة ضبط حالات العناصر؟` |
| `wp.confirmReset.description` | `You have {count} element(s) with custom Move/Lock or notes that weren't set manually. Clearing the description will reset them to default Move.` | `لديك {count} عنصر/عناصر بحالات أو ملاحظات لم يتم ضبطها يدويًا. مسح الوصف سيعيدها إلى الحركة الافتراضية.` |
| `wp.confirmReset.confirm` | `Reset badges` | `إعادة الضبط` |
| `wp.confirmReset.cancel` | `Keep them` | `الاحتفاظ بها` |

(`{count}` is interpolated with `pendingResetCount` at render time.)

### Files touched

- `src/components/WorkflowPanel.tsx` — confirm dialog state, refactored reset path, `AlertDialog` JSX.
- `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts` — four new keys.

No other components, styles, or backend changes. Existing Undo flow remains intact and only fires after a confirmed reset.

