

## Auto-switch Move/Lock based on mentions in the description

### What changes

When the user types in the description box and mentions an element via `@N`, automatically set that element's action based on the surrounding verb/intent:

- Mentions near **motion verbs** (move, walk, run, fly, rotate, shift, travel, sweep, drift, pan, zoom, animate, morph, transform) → set action to **move**.
- Mentions near **lock verbs** (keep, lock, freeze, hold, stay, fix, preserve, maintain, unchanged, still, static, same) → set action to **lock**.
- Mentions with no nearby intent verb → leave the current action untouched (don't overwrite user manual clicks arbitrarily).

The detection runs live on every keystroke in the description textarea (debounced ~150ms) and updates `elementDirections` in state, which instantly re-renders the Lock/Move buttons in `SceneBreakdown` with their red-glow/cyan states.

### Detection rule

For each `@N` token in the text:
1. Grab a window of ~6 words before and ~6 words after the mention.
2. Scan that window for any lock-verb → set `lock`. Else scan for any move-verb → set `move`. Else skip.
3. Map `@N` → element id using the existing `globalIndexById` logic already used by `SceneBreakdown`.

Verb lists live in one place and are English-only in v1 (Arabic verbs out of scope unless asked; mentions still work in Arabic text, they just won't auto-switch).

### Manual override behavior

If the user clicks Lock/Move manually on an element, we record a `manualOverride` flag for that element id. Auto-detection will **skip** overridden elements so typing doesn't fight the user's explicit choice. Clicking the same button again (toggling) clears the override so auto-detect resumes.

### Visual feedback

Small transient indicator on each element card when its action is auto-changed by typing: a brief 600ms pulse on the active button (reusing existing primary/destructive colors). No new tooltips.

### Files touched

- `src/components/WorkflowPanel.tsx`
  - Add `useEffect` on the description value that parses `@N` tokens, inspects the word window, and calls `setElementDirections` for non-overridden elements. Debounced via `setTimeout`.
  - Track a `manualOverrides: Record<string, boolean>` Set alongside `elementDirections`.
  - Pass an `onManualToggle` callback to `SceneBreakdown` so manual clicks mark the override.
- `src/components/SceneBreakdown.tsx`
  - Accept optional `onManualToggle(id)` prop, call it inside the existing `toggleAction` handler before updating.
  - Add a short pulse animation class on the active button when the action changes (`key`-based remount or a `useEffect` that toggles a class for 600ms).
- `src/lib/sceneIntent.ts` *(new, small)*
  - Export `MOVE_VERBS`, `LOCK_VERBS`, and `detectIntent(text, mentionIndex): "move" | "lock" | null`.
- `src/i18n/translations/en.ts` & `ar.ts`
  - `scene.autoAssignedHint` — "Tip: mention elements with verbs like 'keep' or 'move' to auto-set Lock/Move." (shown as a small muted line under the description box, breakdown phase only).

### Out of scope
- Arabic verb detection.
- Detecting ranges (`@1-@3`) or plural mentions.
- Changing the confirmation dialog or skip path.

