## Goal

Make every "waiting" state in the Director feel like one cinematic loader — same dots, same avatar, same rotating caption, same in‑button spinner. No more random "Generating storyboard panels…" plain text that doesn't match the typing indicator.

## What changes

### 1. One shared loader primitive

Create `src/components/director/CinematicLoader.tsx` exporting two surfaces that share the exact same dot animation, color, and timing as today's `TypingIndicator`:

- `<CinematicLoader caption | captions | stages />` — full bubble: `AssistantAvatar` + animated 3‑dot pill + rotating caption underneath. Used in the chat stream and inside cards.
- `<CinematicSpinner size?: "sm"|"xs" />` — tiny inline 3‑dot variant for buttons (replaces the mismatched `Loader2 animate-spin`). Same primary‑cyan dots, just scaled down.

Caption rotation reuses the existing 2.2s interval + `prefers-reduced-motion` fallback.

### 2. Chat message loading bubbles (DirectorChat.tsx)

Add a new bubble role `loading` with `{ stage: "image" | "story_bundle" | "story_render" | "render_handoff" | "panels" | "character_sheet" | "reference" | "custom"; captions?: string[] }`.

Replace these plain‑text `animate: true` bubbles with `role: "loading"` bubbles that render `<CinematicLoader />`:

- "Generating storyboard panels…" → `stage: "panels"`
- "Designing a character sheet…" → `stage: "character_sheet"`
- "Generating a reference frame…" → `stage: "reference"`
- "Building the story asset bundle — character + prop + 7 locations…" → `stage: "story_bundle"`
- "Kicking off 4 parallel acts on Seedance 2.0…" → `stage: "story_render"`
- "Sending this to the {provider} renderer…" → `stage: "render_handoff"`, captions include provider name

Each stage gets a curated rotating caption set (e.g. panels → "Blocking the sequence…", "Lighting panel 3…", "Color‑grading the set…"). Loading bubbles are transient — never persisted (already guarded by `busy`).

### 3. De‑dupe: single indicator at a time

In the render loop, when the **last** bubble in the stream is `role: "loading"`, suppress the bottom `<TypingIndicator />`. Otherwise keep it. Result: exactly one cinematic loader visible at any moment.

### 4. Image generation card progress (GeneratedImageCard.tsx)

Replace the two `Loader2 animate-spin` indicators (storyboard chain progress at line ~505 and animate button placeholder at ~643) with `<CinematicSpinner size="xs" />`. The storyboard progress bar keeps its `done/total` counter but the leading icon becomes the 3‑dot indicator so it visually matches the chat loader.

### 5. Video render bubble (VideoBubble.tsx)

Keep the existing cinematic stage names ("Warming up the lens", "Blocking the shot", "Lighting the scene", "Rolling camera", "Rendering frames", "Final color pass"). Refactor the visual: render `<CinematicLoader captions={RENDER_STAGES} />` (avatar + dots + rotating stage label) instead of the current bespoke layout. The `queued → processing` advance still drives `stageIdx`.

### 6. In‑button spinners

Swap every `<Loader2 className="… animate-spin" />` inside a button for `<CinematicSpinner size="xs" />` in these files:

- `Composer.tsx` (Send, Paperclip ingesting, Sparkles enhancing, Image prompt, plus two more occurrences)
- `GeneratedImageCard.tsx` (Animate, Animate‑all, Polish re‑render)
- `PromptResultCard.tsx` (Generate video CTA)
- `QuestionUploadSlot.tsx` and `AttachmentDropzone.tsx` (ingest spinners)
- `AnimatePanelDialog.tsx` if it has any

The `Loader2` import is removed from each file once unused.

### 7. Tokens & motion

Dot color stays `bg-primary/80`. The `animate-dot-bounce` keyframe already exists in tailwind config and `index.css` — no new tokens needed. `motion-safe:` and `prefers-reduced-motion` fallback are preserved everywhere.

## Out of scope

- No backend changes (no edge function or schema edits).
- No copy changes outside loading captions.
- `TypingIndicator.tsx` keeps its current API — internally it just imports the new `CinematicLoader` to stay DRY.
- Toasts and `AwaitingApprovalPill` are not loaders, untouched.

## Verification

1. Open `/director/...`, send a storyboard request → see only ONE loader (cinematic dots + rotating caption like "Blocking the sequence…"), no duplicate text bubble + typing indicator.
2. Trigger "Animate panel" → button shows 3 dots (not Loader2 spin), chat shows render‑handoff loader, then VideoBubble shows the same dots + rotating stage name.
3. Use Composer's Enhance/Image prompt/Send → buttons all show the same 3‑dot spinner.
4. Toggle `prefers-reduced-motion` → all loaders fall back to "Director is working…" static label, no dot bounce.
5. Reload mid‑generation → no stale loading bubble persists (guard at line 474 already handles this).
