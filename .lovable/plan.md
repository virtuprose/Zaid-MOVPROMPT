## Goal

When the Director generates a **second, distinct character sheet**, render a brand-new identity instead of cloning the first character.

## Root cause

`DirectorChat.runImageGeneration` (src/components/director/DirectorChat.tsx, ~L722–729) auto-injects the pinned subject sheet into `reference_urls` for every image call unless `options.subjectSheet === true`. When the agent calls `mode: "character_sheet"` without that option (e.g. routed through the tool path rather than the explicit "create subject sheet" UI path), the first character's sheet rides along as a reference. The edge function then activates the identity-lock branch in `generate-reference-image/index.ts` (L270–276) — "Do not redesign the character; only re-pose and re-angle the same person." — and the model dutifully reproduces character #1.

## Changes

### 1. `src/components/director/DirectorChat.tsx` — gate the auto-attach by mode

In `runImageGeneration`, change the guard so the pinned subject is NEVER auto-attached when `payload.mode === "character_sheet"`. The sheet is, by definition, the identity-defining artifact — it should only carry a reference when the agent explicitly passes one (e.g. user-uploaded photo of the new character).

```ts
// before
if (!options?.subjectSheet && pinnedSubject) { ... }

// after
const isSheetMode = payload.mode === "character_sheet";
if (!isSheetMode && !options?.subjectSheet && pinnedSubject) { ... }
```

This keeps the existing behavior for `storyboard_panels` and `single_panel` (which still inherit the pinned subject), and only frees `character_sheet` calls.

### 2. `supabase/functions/director-agent/index.ts` — soften the one-sheet rule

Update the line in the system prompt (L310):

> "DO NOT generate more than one character_sheet per session unless the user asks for variations."

to explicitly permit additional sheets for *new, distinct* characters:

> "Generate additional `character_sheet` calls when the user asks for a NEW or DIFFERENT character (co-star, second protagonist, antagonist). When doing so, do NOT pass the existing character's image in `reference_urls` — only attach a reference if the user uploaded one for the new character. Avoid regenerating the same character on a whim."

This keeps the don't-spam-sheets intent but unblocks the legitimate "add a second character" flow.

## Out of scope

- Multi-character pinning / picker UI (today only one subject is pinned at a time — a future improvement, not this fix).
- Edge-function changes to `generate-reference-image` — the lock logic is correct; the bug is upstream in what gets passed in.
- Storyboard/key-frame behavior — unchanged.

## Verification

1. Generate character sheet A from a photo or description.
2. Ask the Director: "create another character — a tall older man with grey beard".
3. Confirm the new sheet shows a different identity, not character A re-posed.
4. Storyboard panels still lock to whichever subject is currently pinned (regression check).
