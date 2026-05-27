## How `@N` actually works today

After scene analysis, every analyzed element gets a number (`flatSceneElements` in `WorkflowPanel.tsx`). The count depends on what the AI found in your photo(s), **not on how many photos you uploaded**.

- 1 image of a person on a street → maybe `@1 Subject, @2 Background, @3 Lighting, @4 Atmosphere` → valid range `@1–@4`.
- 2 frames (Start + End) → elements are flattened across both, so you could end up with `@1–@8`, where some belong to Start Frame and others to End Frame (currently invisible to the user).
- Pre-analysis or `ConfigPanel` fallback → no `@` system at all.

The current bug: `SceneMentionTextarea` highlights valid `@N` in primary color but **silently renders out-of-range `@5`, `@99` as plain text** — nothing tells the user it's invalid. The hint also doesn't say what `N` means or what the valid range is, so users assume `@N` = "photo number".

## Fixes

All in `src/components/SceneMentionTextarea.tsx` (and one i18n addition):

### 1. Bound and explain the hint

Replace the static hint line with a contextual one:

- When `elements.length === 1`: "Type `@1` to reference your scene's element."
- When `elements.length > 1`: "Type `@1`–`@{N}` to reference an analyzed scene element (subject, lighting, etc.) — not a photo number."
- Add a small info `(?)` tooltip with one sentence: "After we analyze your image, your scene is split into N labeled elements. `@N` points to one of them."

### 2. Highlight invalid `@N` in red inline

In `renderHighlighted`, when `n > elements.length` or `n < 1`, render with destructive token styling (red text + dashed red underline) instead of plain text. The user sees `@5` glow red the moment they type it past the valid range.

### 3. Validation chip under the textarea

When the description contains any out-of-range mentions, render a single small warning line below the textarea (replacing the standard hint):

`⚠ "@5, @9" don't exist — only @1–@4 are available. [Pick from list]`

The `[Pick from list]` link opens the existing mention picker. No toast, no blocking — informational only.

### 4. Show which frame each element belongs to (multi-frame only)

Thread `frameLabels` and `frame.frameIndex` into `SceneMentionTextarea` so the picker rows show a tiny frame badge:

```
@3  Start frame · 💡 Lighting    Soft window light from the left
@4  End frame   · 🎯 Subject     Woman turns toward camera
```

For single-frame workflows the badge says "Your frame" or is hidden — so it's obvious `@N` is not "photo N".

Requires passing `frameLabels` and per-element `frameIndex` from `WorkflowPanel.tsx` into `SceneMentionTextarea` (extend `SceneMentionElement` with optional `frameLabel`).

### 5. i18n keys

Add to `src/i18n/translations/en.ts` and `ar.ts`:

- `scene.mentionHint.range` — "Type @1–@{n} to reference an analyzed scene element."
- `scene.mentionHint.single` — "Type @1 to reference your scene's element."
- `scene.mentionHint.info` — "After analysis, your scene is split into N labeled elements. @N points to one of them — it's not a photo number."
- `scene.mentionHint.invalid` — "{tokens} don't exist — only @1–@{n} are available."
- `scene.mentionHint.pickFromList` — "Pick from list"

## Out of scope

- The element-reference `MentionTextarea` (workflows where `contract.supportsElementReferences` is true) — `@N` there points to uploaded element reference images and is already valid by construction.
- Backend prompt assembly / `sceneIntent` parsing — no change.
- Renaming the `@` syntax.
- Auto-rewriting/removing invalid mentions on Generate — we warn, the user fixes.
