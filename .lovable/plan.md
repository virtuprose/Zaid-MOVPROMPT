# Key-frame → frame-by-frame image generation

Add a "hero frame first, then extend" flow so the Director can generate a single key image (product shot, cinematic scene, establishing frame) and then build subsequent frames one-by-one anchored on that key. Reuses the existing `generate-reference-image` edge function and `GeneratedImageCard` — no new surfaces.

## Why

Today the Director can do:
- 1 character sheet → drives identity across 9 panels
- 9 storyboard panels in one batch

Missing: the user starts with **no character**, just wants a single hero shot ("a Coke can on a marble counter, golden hour") and then asks "give me 8 more frames that continue this moment". The character-sheet path doesn't fit (no character), and the storyboard-panels path needs all 9 beats upfront.

## Flow

```text
User: "make me a cinematic shot of [X]"      User: "now extend it into a sequence"
        │                                             │
        ▼                                             ▼
  generate_reference_image                      generate_reference_image
  mode: "single_panel"                          mode: "storyboard_panels"
  → 1 hero frame, role: "key_frame"             reference_urls: [hero frame URL]
        │                                       per_shot_prompts: [beat 2..N]
        │                                       → N-1 panels, role: "storyboard"
        │                                              │
        └──── both anchored on the same hero frame ◄───┘
                       │
                       ▼
            existing ask_model_choice → render flow
```

## Changes

### 1. `supabase/functions/generate-reference-image/index.ts`

- **Promote `single_panel` to a real hero frame**: accept optional `aspect_ratio: "1:1" | "16:9" | "9:16"` (already there) and harden the prompt so the model treats it as a polished hero still — explicit "single hero frame, polished composition, depth of field, no text overlay" suffix when no reference is attached, otherwise the existing identity-lock prefix.
- **New `frame_extension` mode** (or reuse `storyboard_panels` with a `key_frame_url` reference — simpler):
  - Continue using `mode: "storyboard_panels"` for extensions; the difference is in the prompt content the Director sends (per-shot beats reference "moments after the key frame", "continuation of the same scene", etc.).
  - When `reference_urls` is set but no character context is implied, swap the identity-lock phrase for a **scene-lock** phrase:
    > "Same scene, lighting, color grade, lens, and composition as the attached key frame. Maintain continuity of subject, background, props, and time of day. Shot N of N: <beat>"
  - Tag selection happens via a new optional `lock_mode: "character" | "scene" | "auto"` param. Default `auto` keeps current behavior (character-lock when ref present); explicit `scene` is used for product/landscape/establishing extensions.

### 2. `supabase/functions/director-agent/index.ts`

System prompt additions under IMAGE GENERATION:
- **Single hero frame** (new use case 4): when the user asks for a polished one-off image (product shot, cinematic still, key art, establishing frame, opening shot) and isn't talking about characters yet → call `generate_reference_image` with `mode: "single_panel"`, the full locked visual spec in `prompt`, and no `reference_urls`.
- **Frame extension**: when after a hero frame the user says "extend this", "give me N more frames", "continue the scene", "build a sequence from this" → call `generate_reference_image` with `mode: "storyboard_panels"`, `lock_mode: "scene"`, `reference_urls: [<hero frame URL from prior turn>]`, `per_shot_prompts` (one per continuation beat), and echo the locked visual spec verbatim.
- The Director must propose the continuation beats itself (e.g. "ice begins to melt", "condensation runs down the can", "camera dollies left", "sun dips, shadows lengthen") before calling the tool, and lay them out in `directors_note` so the user can approve or tweak.
- Add `lock_mode` to the tool schema.

### 3. Client wiring

- `src/lib/director/api.ts`: add `lock_mode?: "character" | "scene" | "auto"` to the `generate_reference_image` agent response type and the `generateReferenceImage` wrapper.
- `src/components/director/DirectorChat.tsx`:
  - Tag generated `single_panel` images with a new attachment role `"key_frame"` (in addition to existing `"reference"`) so subsequent extension calls can find them by role.
  - Forward `lock_mode` through to the edge function.
  - Carrier-bubble copy: "(Generated key frame — use as scene anchor.)" for `single_panel`.

### 4. `src/components/director/GeneratedImageCard.tsx`

- For `mode: "single_panel"`, add an **"Extend frame-by-frame"** action button under the image that sends a chat intent like:
  > "Extend this key frame into a sequence — propose 8 continuation beats that keep the same scene, lighting, lens, and composition, then generate them."
- Keep the existing per-image "Redo" button.
- Label changes from "Generated frame" → "Key frame" for `single_panel`.

### 5. Attachment role extension

- `src/lib/director/ingest.ts`: extend `AttachmentRole` to include `"key_frame"`.
- The aggregation logic in `DirectorChat` (`referenceImageUrls`) needs no change — key frames still flow into `reference_urls` for video generation as the starting frame.

## Out of scope

- No new edge function. No new bucket.
- No standalone "image studio" page. No Composer button for image-only generation.
- No multi-key-frame chaining (key frame A → key frame B → fill between). Strictly: one hero + linear extension.
- No video interpolation between frames (that's the existing video gen flow).

## Acceptance

- User: "make me a cinematic shot of a vintage Polaroid on a desk, dusk window light, 35mm". Director calls `single_panel`, returns one polished hero still with no character lock. Card shows "Key frame" + "Extend frame-by-frame" button.
- User clicks "Extend frame-by-frame" (or types "extend it 8 frames"). Director proposes 8 continuation beats in chat, then calls `storyboard_panels` with `lock_mode: "scene"` + the hero frame URL. Returns an 8-cell grid where lighting/lens/scene stay continuous.
- User can then "Redo panel 5" with the same scene-lock anchor.
- Existing character-sheet → 9-panel flow keeps working unchanged (`lock_mode: "auto"` defaults to character-lock when a character ref is present).

## Files touched

- `supabase/functions/generate-reference-image/index.ts`
- `supabase/functions/director-agent/index.ts`
- `src/lib/director/api.ts`
- `src/lib/director/ingest.ts`
- `src/components/director/DirectorChat.tsx`
- `src/components/director/GeneratedImageCard.tsx`
