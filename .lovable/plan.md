## Problem

User clicks Format → Hook → Setting cards, then clicks **Generate**, but gets the toast *"Pick a format, hook and setting first."* The session replay confirms `formatId`/`hookId`/`settingId` end up unset even after the user picked cards.

## Root cause

`PresetPickerDialog` uses a **draft state** pattern: tapping a card only updates `draftId`, and the selection is committed to the parent state **only when the user clicks the bottom "Apply settings" button**. If the dialog closes any other way — overlay click, ESC, or the dialog `X` — `apply()` never runs and the draft is discarded. Most users intuitively close the modal after picking a card, never seeing the footer button. So `formatId`/`hookId`/`settingId` stay `undefined` and the generate guard blocks them.

## Fix

Make any close path commit the current draft. Keep an explicit **Cancel** for users who want to back out.

### `src/components/marketing/PresetPickerDialog.tsx`

1. Extract the existing `apply()` body into a stable callback that commits `draftId` / `draftCustom` / `draftLocation` to the parent.
2. Add a `cancelledRef = useRef(false)` flag. Reset it to `false` inside the open-sync `useEffect`.
3. Replace `onOpenChange={onOpenChange}` on `<Dialog>` with a wrapper:
   - When opening (`next === true`), forward as-is.
   - When closing (`next === false`), if `cancelledRef.current` is `false`, call `apply()` (which itself calls `onOpenChange(false)` at the end). If `true`, just call `onOpenChange(false)`.
4. Update `cancel()` and the footer Cancel button to set `cancelledRef.current = true` before calling `onOpenChange(false)`.
5. Rename the footer "Apply settings" button to **"Done"** (still calls `apply()`); add subtle helper text on the left of the footer: *"Selection saves automatically — Cancel to discard."*
6. Keep ESC-clears-search behavior; ESC with empty search will close the dialog and now auto-commits (desired).

### Out of scope

- No changes to `MarketingStudio.tsx`, `LocationPanel.tsx`, generate logic, or prompt composition.
- No data-model changes.

## Verification

- Open Setting → click a scene card → click outside → toolbar chip should now show the picked scene; Generate proceeds.
- Open Setting → click a card → click **Cancel** → previous selection (if any) is preserved, no commit.
- Same flow re-tested for Format and Hook pickers.
