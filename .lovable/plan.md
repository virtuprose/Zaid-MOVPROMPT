## Goal

Always render the character / product / object sheet at 16:9 (it currently defaults to 1:1).

## Changes

1. `supabase/functions/generate-reference-image/index.ts` line 139 — change the default for `character_sheet` from `"1:1"` to `"16:9"`:
   ```ts
   const aspect = body.aspect_ratio || "16:9";
   ```
   (Single unified default; storyboard_panels and single_panel already use 16:9.)

2. `supabase/functions/director-agent/index.ts` line 436 — update the tool parameter description so the model stops trying to send `1:1` for sheets:
   ```
   "Echo the locked aspect when possible. Defaults to 16:9 for all modes (character/product/object sheets, storyboard panels, single panel)."
   ```

## Out of scope

- Layout copy inside the sheet prompt (front / 3-4 / side composition) stays the same; only the canvas ratio changes.
- No frontend changes — the UI just displays whatever the edge function returns.
