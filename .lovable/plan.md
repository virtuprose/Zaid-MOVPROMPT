## Goal

After a character/product/object sheet is generated, prompt the user to describe the opening key frame scene BEFORE showing the aspect-ratio chip. That scene description becomes the seed for the whole story (subsequent storyboard panels).

Today the flow is:
1. User submits brief → Director queues a key frame
2. Subject-lock chip → user picks character / product / none
3. Sheet generates (auto-pinned)
4. Aspect-ratio chip appears immediately ← **insert new step here**
5. User picks aspect → key frame renders

New flow inserts a "describe the key frame" step between 3 and 4 — only when a sheet was actually built (character/product). The "none" branch stays as-is (skip describe, go straight to aspect).

## Changes

### `src/components/director/DirectorChat.tsx`

1. **New bubble type** `scene_describe`:
   ```ts
   { role: "scene_describe"; payload: ImagePayload; submitted?: boolean }
   ```
   Add to the `Bubble` union, persistence serialization, and the rehydration switch (treat like other choice bubbles).

2. **`handleSubjectLockChoice`** (lines 601–654): when `kind !== "none"`, after the sheet returns, append a `scene_describe` bubble instead of the `aspect_choice` bubble. Keep the `none` branch unchanged (still goes straight to aspect).

3. **New handler** `handleSceneDescribeSubmit(bubbleIndex, sceneText)`:
   - Mark the `scene_describe` bubble `submitted: true`.
   - Append a user bubble showing what they wrote (so it's visible in the transcript).
   - Build the aspect chip payload by merging the scene description into the original key-frame prompt:
     ```ts
     const mergedPrompt = sceneText.trim()
       ? `${target.payload.prompt}\n\nOpening key frame scene: ${sceneText.trim()}`
       : target.payload.prompt;
     const aspectBubble = { role: "aspect_choice", payload: { ...target.payload, prompt: mergedPrompt } };
     ```
   - Append and persist.
   - Allow skipping (empty submit) → just append the aspect chip with the original payload.

4. **Renderer** (around line 1638 where `aspect_choice` is rendered): add a branch that renders the new `scene_describe` bubble. Reuse the existing `QuestionCard` component with a single question ("Describe the opening key frame — setting, action, mood, lighting. This anchors the whole story.") and Skip/Continue actions. QuestionCard already supports skip + free-form text and chip suggestions, which fits perfectly. Disable once `submitted`.

5. **Director-agent context** (`buildHistory` around line 772): when a `scene_describe` bubble is pending, push a system note like `[Asked the user to describe the opening key frame scene before choosing aspect ratio. Waiting for their description.]` so the model doesn't try to push the conversation forward.

### `supabase/functions/director-agent/index.ts`

Tiny system-prompt note in the workflow section: after a subject sheet is generated, the client will ask the user to describe the opening key frame, then ask aspect ratio, then generate. The model should not pre-empt either step.

## Out of scope

- Changing the "none" subject-lock branch (still goes straight to aspect).
- Changing what happens for non-sheet key frames (direct first-turn key frame without subject lock — already uses aspect chip directly; user only asked about the post-sheet path).
- Storyboard / multi-shot panels — they already inherit the key frame as anchor.
