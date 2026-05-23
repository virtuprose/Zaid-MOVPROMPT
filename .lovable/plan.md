## Goal

When the Accuracy Boost dialog appears after upload, clicking the amber "Generate anyway" button should NOT start video generation. It should just dismiss the dialog and remember the acknowledgement, so the user can review their setup and then explicitly click the yellow **Generate Ad** button to kick off generation.

## Changes

**1. `src/pages/MarketingStudio.tsx` (around line 1164)**

In the `<AccuracyBoostDialog onGenerateAnyway={...}>` handler, remove the `proceedToRights()` call. Keep:
- `sessionStorage.setItem(ACCURACY_ACK_KEY, "1")` when "don't show again" is checked, so the dialog is suppressed for the rest of the session and the next Generate Ad click goes straight through.
- `setAccuracyOpen(false)` to close the dialog.

This way the dialog simply closes; nothing is generated until the user clicks Generate Ad again.

**2. `src/components/marketing/AccuracyBoostDialog.tsx`**

Relabel the amber action from "Generate anyway" to **"Continue"** so the button copy matches its new behavior (just dismiss + acknowledge). No other UX changes — Cancel and the fix shortcuts stay the same.

## Out of scope

- No changes to the normal Generate Ad flow, credits, rights confirmation dialog, or the accuracy-risk detection itself.
- No backend / edge function changes.
