# Add "Describe" chip near Brand (Bose) and Avatar (Maya)

## Goal

In the composer card on `/marketing`, place a third chip on the same row as the brand chip ("Bose") and avatar chip ("Maya") labeled **Describe**. Clicking it opens an inline mini-textarea (popover) where the user can add a short free-text description.

The Format preset stays the **main, locked** driver of the scene. The user's description is treated as an **adaptation layer** — it tweaks tone/details on top of the preset but never overrides its structure or framing.

## UX

Row 1 of the composer card (line 587 in `src/pages/MarketingStudio.tsx`) becomes:

```text
[ 🏢 Bose  × ]   [ 👤 Maya  × ]   [ ✎ Describe … ]
```

- Empty state: dashed pill `✎ + Describe`, same visual language as the empty brand/avatar pills.
- Filled state: solid pill `✎ "Make it feel late-night and intimate…" ×` (truncated to ~28 chars, full text in tooltip).
- Click opens a small popover with a `Textarea` (3–4 rows), 280 char limit, helper copy: *"Adapts the scene on top of the preset. Preset stays in charge."*
- Auto-saves on blur; `×` clears it.

## Behavior

The new value lives in component state as `userNote: string`.

1. **Auto-draft (write-ad-scene)** — added to the dependency array and passed to `writeAdScene` as a new `userNote` field. The edge function's system prompt is updated to: *"Treat `format` and `setting` as locked structure. Treat `userNote` as an adaptation layer — adjust tone, mood, small details, but never override the preset's framing or category."*
2. **Final prompt (composeStudioPrompt)** — `userNote` is appended as an `Additional direction:` line at the end of the composed prompt so the generator sees it even if the auto-draft didn't fully fold it in.
3. **Persistence** — kept ephemeral (component state only), matching how `master` and `customFormat` behave today.

## Files

- `src/pages/MarketingStudio.tsx`
  - Add `userNote` state + a small `DescribeChip` component (inline or co-located) using `Popover` + `Textarea`.
  - Insert it in the row at line 587, after the avatar chip.
  - Wire `userNote` into the `writeAdScene` effect (lines 212–281) and into `composeStudioPrompt` (line 307).
- `src/lib/marketingStudio.ts` — extend `composeStudioPrompt` signature to accept `userNote?: string` and append it as `Additional direction: …` when present.
- `supabase/functions/write-ad-scene/index.ts` — accept optional `userNote` in the request body, include it in the user message, and add the "preset is locked, note adapts" rule to the system prompt.

## Out of scope

- No new database columns, no brand/avatar kit changes, no preset picker changes.
- No changes to how Format / Location / Generate ad row renders.
