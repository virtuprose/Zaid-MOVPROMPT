## Goal

Whenever the user asks the Director to generate a **new character, product, or hero item** with a new description, the Director must render that new identity — never reuse or re-pose the previously pinned subject.

## What's already fixed (last turn)

- `runImageGeneration` in `DirectorChat.tsx` now skips auto-attaching the pinned subject when `mode === "character_sheet"`.
- System prompt in `director-agent/index.ts` updated to allow additional character sheets for new/different characters and to forbid passing the existing character's image in `reference_urls`.

## What still leaks the old identity

Two remaining paths can clone the previous subject when the user describes something new:

1. **`mode: "single_panel"` (hero/product/key-frame)** — `runImageGeneration` still auto-injects `pinnedSubject.url` into `reference_urls`. If the user says "now generate a different product — a red sneaker", the function silently attaches the previously pinned bottle/character, and `generate-reference-image` applies an identity-lock-equivalent prompt for scene/character continuity. Result: same product, new background.
2. **System prompt — product/item parity** — the soften-the-rule edit only mentions characters. The agent still treats product sheets as one-per-session and tends to reuse the locked product.

## Changes

### 1. `src/components/director/DirectorChat.tsx` — extend the no-auto-attach guard

Currently:
```ts
const isSheetMode = payload.mode === "character_sheet";
if (!isSheetMode && !options?.subjectSheet && pinnedSubject) { ... }
```

Add a "fresh subject" signal coming from the agent. When the agent explicitly omits `reference_urls` AND calls `single_panel` or `character_sheet` after the user described a new subject, do not silently re-inject the pinned one.

Concretely:
- For `mode: "character_sheet"`: already skipped (keep).
- For `mode: "single_panel"`: skip auto-attach when the agent passed `reference_urls: []` or omitted it entirely. The agent is now responsible for opting INTO the pinned subject by passing its URL itself when continuity is wanted. (Storyboard panels still auto-attach — they need continuity by definition.)

```ts
const isSheetMode = payload.mode === "character_sheet";
const isFreshSinglePanel =
  payload.mode === "single_panel" &&
  (!payload.reference_urls || payload.reference_urls.length === 0);
const skipAutoAttach = isSheetMode || isFreshSinglePanel || options?.subjectSheet;
if (!skipAutoAttach && pinnedSubject) { ... }
```

### 2. `supabase/functions/director-agent/index.ts` — broaden the rule + nudge agent to re-read intent

Two small prompt edits:

a. **Generalize the "new subject" rule** (currently character-only) to characters AND products/items/hero objects:

> "Generate additional `character_sheet` calls when the user asks for a NEW or DIFFERENT subject — character (co-star, antagonist, sidekick) OR product/item (a second product, different SKU, alternate hero object). When doing so, DO NOT pass the previous subject's image in `reference_urls`; only attach a reference if the user uploaded a new photo for the new subject. The new sheet must establish a fresh identity, not re-pose / re-render the previous one. Avoid regenerating the same subject on a whim."

b. **Add a READ-INTENT pre-check** near the top of the IMAGE GENERATION section:

> "BEFORE calling `generate_reference_image`, re-read the user's latest message. If they describe a NEW subject (new character, new product, new item, new look) — even subtly ("now generate X", "another one with…", "different…", "second character", "swap to…", any non-matching description) — treat it as a fresh subject: clear `reference_urls` of any previous subject, and base the prompt only on the new description. NEVER copy details from the previously pinned subject into the new prompt."

c. **Same rule for `mode: "single_panel"`**: if the user described a new product/hero, do not pass the previously pinned subject as `reference_urls`. Pass refs only when the user explicitly says "the same X, but…" / "use the bottle from before".

## Out of scope

- Multi-subject pinning / a UI picker for which subject to lock to (future feature).
- Backend prompt changes in `generate-reference-image` — the lock branch is correct; the bug is what the client/agent feeds it.
- Storyboard continuity — unchanged. Storyboards must keep locking to the active subject.

## Verification

1. Generate character A, then ask: "now create a different character, a young woman with red hair". → New identity, not A.
2. Generate a bottle product sheet, then ask: "now generate a sneaker, red and white". → New product, not the bottle.
3. Generate a hero key frame for product X, then ask: "make a hero shot of a different watch". → New watch, not X.
4. Regression: with subject A pinned, ask "give me a storyboard of A walking". → Still locks to A across panels.
