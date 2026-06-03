## Remove the "Inspect prompt" button

The amber document icon in the screenshot is the `<PromptInspector>` trigger rendered on every generated image card.

### Changes — `src/components/director/GeneratedImageCard.tsx`
- Delete the `<PromptInspector ...>` block (around lines 517-527) so it no longer renders next to the panel actions.
- Remove the `PromptInspector` import at the top of the file.

### Out of scope
- Keep `src/components/director/PromptInspector.tsx` on disk for now (no other deletions). It will simply become unused — easy to revive if you change your mind. Say the word if you also want the file deleted.
- No changes to `sessionContext.ts` (that file references `inspector` data shape, not the button itself).
