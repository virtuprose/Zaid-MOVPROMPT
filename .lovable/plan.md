

## Enhance Copy All Feedback

The "Copy All" button works (it does copy to clipboard), but there's **no visual feedback** — the user can't tell anything happened. The individual `CopyButton` component shows a checkmark, but the main "Copy All" button doesn't.

### Changes

**`src/components/ResultsPanel.tsx`**:
- Add a `copied` state to track when "Copy All" was clicked
- Show a green checkmark icon (`Check`) instead of the `Copy` icon for 2 seconds after clicking
- Change button text to "Copied!" temporarily
- Add a toast notification as secondary feedback
- Wrap `navigator.clipboard.writeText` in try/catch with fallback for older browsers

### Translation keys

**`en.ts`** + **`ar.ts`**:
- Add `results.copied` — "Copied!" / "تم النسخ!"

