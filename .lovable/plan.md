

## Add Undo for auto-reset of Move/Lock badges

When the Describe textarea is cleared, all non-overridden badges snap back to `move`. Add an Undo affordance so the user can restore the previous Move/Lock state in one click.

### Behavior

- The moment the auto-reset fires (description becomes empty and at least one badge actually changed), capture a snapshot of the **previous** `elementDirections` and show an Undo control.
- Clicking **Undo** restores `elementDirections` to that snapshot exactly (including notes), and dismisses the Undo control.
- The Undo control auto-dismisses after ~8 seconds, or as soon as the user types anything back into Describe (so a stale snapshot can't overwrite new intent).
- Manual badge toggles and `manualOverrides` are unaffected — Undo only restores what the auto-reset wiped.
- Re-clearing the textarea after typing again captures a fresh snapshot (the previous one is replaced, never stacked).

### UI

In `src/components/WorkflowPanel.tsx`, render the Undo control as a small inline toast-style row directly above the scene breakdown (same column as the Describe textarea), only while a snapshot exists:

```
[ ↶ Badges reset · Undo ]
```

- Style: `text-xs text-muted-foreground`, subtle border, `bg-card/60`, `rounded-md px-3 py-1.5`, with a ghost-styled "Undo" button on the trailing edge. Mirrors automatically in RTL via flex.
- Uses existing `RotateCcw` icon (already imported for Start Over) — no new icons.

### Implementation outline

In `src/components/WorkflowPanel.tsx`:

1. Add state: `const [resetSnapshot, setResetSnapshot] = useState<Record<string, ElementDirection> | null>(null);` and a ref for the auto-dismiss timer.
2. In the existing empty-text branch of the auto-assign `useEffect`:
   - Compute the candidate `next` map as today.
   - If `changed` is true, call `setResetSnapshot(prev)` (the pre-reset map) before returning the new state.
   - Start/refresh an 8s timer that clears the snapshot.
3. In the non-empty branch (top of the same effect, before debounce work), if `resetSnapshot` exists, clear it and the timer — typing invalidates the undo.
4. Render the Undo row conditionally between the Describe textarea block and the `SceneBreakdown` motion.div.
5. Undo handler: `setElementDirections(resetSnapshot)`, then `setResetSnapshot(null)` and clear the timer.
6. Cleanup: clear the timer on unmount and on `phase` change away from `generate`.

### Translations

Add two keys to both `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts`:

- `wp.badgesReset` → EN: `"Badges reset"` · AR: `"تمت إعادة ضبط الحالات"`
- `wp.undo` → EN: `"Undo"` · AR: `"تراجع"`

### Files touched

- `src/components/WorkflowPanel.tsx` — snapshot state, Undo row, handlers, timer cleanup.
- `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts` — two new keys.

No other components, styles, or backend changes.

