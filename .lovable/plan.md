## Goal
Replace the browser-tab favicon with the new gold-triangle logo the user just uploaded.

## Change
1. Copy `user-uploads://Minimalist_Luxury_Logo_Design_May_19_2026_2-4.png` → `public/favicon.png` (overwrite existing).
2. No code edits needed — `index.html` already references `/favicon.png` (line 5: `<link rel="icon" type="image/png" href="/favicon.png">`).

## Out of scope
- No changes to the in-app `Wordmark`/header logo (still text "MovPrompt"). If the user also wants the header swapped to this mark, that's a follow-up.
