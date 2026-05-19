## Goal

When the Director is about to generate a **key frame** (`mode: "single_panel"`), pause and ask the user which aspect ratio to use. After they pick, generate the image at that ratio. Later, when they click **Extend frame-by-frame**, every storyboard panel inherits the same aspect ratio from the anchor key frame — automatically, no second prompt.

## UX flow

1. Director responds with `generate_reference_image` (mode = `single_panel`, no character ref).
2. Instead of calling the edge function immediately, the chat shows an **Aspect ratio** chooser bubble with three chips:
   - `16:9` — Cinematic widescreen
   - `9:16` — Vertical / social
   - `1:1` — Square
3. User taps one → spinner → key frame generates at that ratio.
4. The chosen ratio is stamped onto the generated_images bubble and the resulting key_frame attachment.
5. When the user clicks **Extend frame-by-frame** on that key frame, the regenerate intent already routes through the agent → the agent emits `generate_reference_image` with `mode: storyboard_panels` + `lock_mode: scene`. We override `aspect_ratio` on the client with the anchor key frame's stored aspect before calling the edge function.

Character sheets and storyboards triggered without a key-frame anchor keep their current defaults (no extra prompt).

## Technical changes

**`src/components/director/DirectorChat.tsx`**
- Add a new bubble variant `aspect_choice` carrying the pending `generate_reference_image` payload (everything currently passed to `generateReferenceImage`).
- In the `resp.kind === "generate_reference_image"` branch, if `resp.mode === "single_panel"`, push an `aspect_choice` bubble instead of calling the API. Persist bubbles.
- New handler `handleAspectChoice(pendingPayload, aspect)` runs the existing generation block with `aspect_ratio: aspect`, then stamps `aspect_ratio` onto:
  - the `generated_images` bubble `data` (add optional `aspectRatio` field), and
  - each `key_frame` attachment (extend `Attachment` type with optional `aspect_ratio`).
- In the same branch, when `resp.mode === "storyboard_panels"` AND `resp.lock_mode === "scene"`, look up the most recent `key_frame` attachment in `attachments`/bubble history and override `aspect_ratio` with its stored value (fallback `16:9`).

**`src/components/director/GeneratedImageCard.tsx` (no behavior change needed)** — the existing `Extend frame-by-frame` button already routes through `onRegenerate`, which goes through the agent. No edit unless we want to surface the aspect badge.

**New component `src/components/director/AspectChoiceCard.tsx`**
- Three chip buttons (16:9 / 9:16 / 1:1) with small wireframe icons, styled to match `QuickReplies` / `ModelChoiceCard`.
- Disabled state after a choice is made; shows the chosen ratio.

**`src/lib/director/api.ts`** — no change (aspect_ratio is already in `ImageGenerateRequest`).

**Agent prompt (`supabase/functions/director-agent/index.ts`)** — add one sentence to the system rules: when generating a `single_panel` key frame, omit `aspect_ratio` (or set to a placeholder) because the client will ask the user. When extending a key frame to `storyboard_panels` with `lock_mode: scene`, also omit `aspect_ratio` — client inherits it. Keep current behavior for character sheets.

## Out of scope

- Persisting aspect ratio across page reloads beyond what bubble persistence already handles (it serializes bubble.data, so the stamped field rides along).
- Allowing per-panel aspect override during extension.
- Adding aspect chooser for character sheets (always 1:1) or storyboards that aren't extending a key frame.
