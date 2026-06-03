## Goal
Fix the collapsed **Tasks** sidebar so image tiles render cleanly instead of showing broken-image placeholders or white-filled thumbnails.

## What I’ll change
1. Update the collapsed task item thumbnail renderer in `src/pages/Director.tsx`.
2. Add the same image error/fallback behavior already used in the expanded Tasks list.
3. Keep the compact visual style from the reference screenshot: clean rounded tiles, proper active state, and no broken browser image icon.
4. Verify the collapsed sidebar still shows:
   - image thumbnails when valid
   - the message icon fallback when no valid thumbnail exists
   - correct active-item highlighting

## Expected result
- Broken or blocked thumbnail URLs will no longer show the default browser missing-image icon.
- Empty/invalid thumbnails will gracefully fall back to the chat/message glyph.
- The collapsed Tasks rail will look consistent with the intended clean icon-based design.

## Technical details
- Reuse the existing `onError` image fallback pattern already present in the expanded session list.
- Apply it to the collapsed sidebar button markup without changing navigation, layout, or session loading behavior.
- If needed, slightly tighten the thumbnail container styling so fallback and image states share the same rounded, centered appearance.