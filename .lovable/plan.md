## Goal

Insert a dedicated **Location step** between the character sheet and the key-frame render. The user either uploads a reference photo of the location, or describes it and picks from 3 generated options (location-only, no character). The chosen location is then pinned and composited with the character sheet on the key frame and on any downstream video.

## Why

Today the user only gets to add freeform "scene" text after the character sheet. The result is unpredictable backgrounds — fine for portraits, weak for ads/short films that need a specific place (showroom, kitchen, beach at sunset, neon alley). The Story-Render pipeline already proves that a 3-option location picker dramatically raises satisfaction; we just need to expose the same affordance in the everyday key-frame flow.

## Scope

ONLY the post-character-sheet / pre-key-frame path in `DirectorChat`. The Story-Render 4-acts flow already has its own location picker — unchanged. Storyboard panels and scene-extensions — unchanged. The video generation pipeline already accepts a reference image, so wiring the location through it is a small add.

## Changes

### 1. New bubble role: `location_step`

Add to `Bubble` types in `DirectorChat.tsx`:

```ts
| { role: "location_step";
    payload: ScenePayload;   // same payload passed from character_sheet → scene_describe
    mode?: "ask" | "generating" | "picking" | "done";
    referenceUrl?: string;       // if user uploaded
    options?: { url: string; storage_path: string; index: number }[];
    chosenIndex?: number;
    chosenUrl?: string;
    chosenStoragePath?: string;
  }
```

Replace today's `scene_describe` step with `location_step`. (Keep `scene_describe` type for backward-compatible session restore, but stop producing it for new flows.)

### 2. New component: `LocationStepCard.tsx`

Small card with three states:

- **ask** — two CTAs:
  - "Upload a reference photo" (file picker / drag-drop)
  - "Describe a location" (textarea + chips: "Modern studio", "Sunlit kitchen", "Neon alley", "Beach at golden hour", "Cozy bedroom", "Industrial loft")
  - Plus a small "Skip — surprise me" link
- **generating** — cinematic loader, "Designing 3 location options…"
- **picking** — reuses the existing `LocationPickerCard` styling for 3 tiles (no drop-slot needed; tap to pick). Numbered 1–3. Confirm button.
- **done** — collapsed summary chip: thumbnail + "Location locked".

The card emits:
- `onUpload(file)` → upload to `director-uploads` bucket, then call back with URL
- `onDescribe(text)` → triggers the 3-option generation
- `onChoose(index)` → confirms selection
- `onSkip()` → proceeds straight to aspect with no location anchor

### 3. Generation: 3 location options (character-free)

Reuse the existing `generate-reference-image` edge function with `mode: "single_panel"`, `count: 3`, and CRUCIALLY `reference_urls: []` (no character — the new auto-attach guard from the previous turn already covers this for fresh single-panels). Per-image prompt template:

```
{styleHeader}
Location plate — empty environment. NO people, NO characters, NO products in the frame.
{userDescription}
Cinematic wide establishing shot, photoreal, deep depth of field on the background, even lighting, no text or watermarks.
```

We generate 3 in parallel using the existing streaming endpoint, surfaced through the same `runImageGeneration` plumbing but with a new option `{ locationBatch: true }` so the bubble renders as 3 swappable options inside `LocationStepCard` instead of a normal image bubble.

### 4. New handler: `handleLocationChosen`

When the user picks (or uploads):

1. Pin the chosen image as the `locationAnchor` in chat-level state (mirror of `pinnedSubject`).
2. Attach the URL+storage_path to the message thread as an `Attachment` with `role: "location"`.
3. Advance the flow: push an `aspect_choice` bubble (same as today).
4. When `handleAspectChoice` fires, the resulting `runImageGeneration({ mode: "single_panel" })` call now passes BOTH the character URL and the location URL in `reference_urls` (location first, character second), plus a prompt prefix like:

```
Composite the locked character into the locked location. The character must match the
reference sheet exactly (face, wardrobe, hair). The environment must match the location
plate exactly (architecture, lighting direction, color palette, time of day). Place the
character naturally in the scene with believable shadow contact and color spill.
```

Add the new attachment role to `Attachment` type. Update the system prompt in `director-agent/index.ts` to mention `role: "location"` references and tell the agent to treat them as scene anchors.

### 5. Wiring point

In `handleSceneDescribeSubmit`'s caller (the post-sheet branch around line 1086 in `DirectorChat.tsx`), replace `{ role: "scene_describe", payload }` with `{ role: "location_step", payload, mode: "ask" }`. Skip path goes directly to `aspect_choice` with no location ref (same as today).

### 6. Persistence

Add `location_step` to the bubble persistence whitelist and ledger summarization so the assistant context (around line 1463) reports something like:

> "[Asked the user for a location — they can upload a reference or pick from 3 generated options. Waiting.]"

so the agent doesn't try to pre-empt with its own location.

### 7. Skipping logic

If the original user brief already includes a specific location reference image (e.g. they uploaded an interior photo on turn 1), skip the location_step entirely — pin that upload as `locationAnchor` and jump to `aspect_choice`. We already track uploaded references on the brief; reuse that flag.

### 8. Video stage

`generate-video` already accepts `reference_image_urls`. When the user advances from the key frame to video generation, pass `[locationAnchor.url, characterAnchor.url]` automatically (no UI change needed — it's a one-line tweak in `runVideoGeneration` to include the location anchor alongside the character).

## Out of scope

- Multi-location library / picker UI. One location pinned at a time, same model as the subject pin.
- Editing or re-rolling the chosen location after lock-in (user can always re-pick from the same bubble while `mode !== "done"`).
- Per-shot location swaps inside a storyboard — storyboards still inherit a single locked scene anchor.

## Verification

1. New flow: character sheet → "Describe a location: a rooftop bar at golden hour" → 3 options render → pick #2 → aspect → key frame shows the character in option #2.
2. Upload path: upload a kitchen photo as the location → aspect → key frame shows the character in that exact kitchen.
3. Skip path: skip location → key frame renders as today (character + freeform setting from the original brief).
4. Pre-uploaded location: original brief contained a beach reference photo → location step is silently skipped, character is composited onto that beach.
5. Video stage: after key-frame approval, video generation receives BOTH the character and the location URLs as reference images.
6. Regression: Story-Render 4-acts flow is untouched and still uses its own 7-tile location picker.
