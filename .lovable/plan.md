

## Keep Results Visible After Removing Image

**Problem:** When a user removes their uploaded image after generation, everything resets — results disappear, config clears, and the workflow restarts from scratch. The user loses their generated prompts.

**Fix:** When removing an image, only clear the image itself and reset the phase to "upload". Keep the results, description, model selection, and scene data intact. The results remain visible below. Once a new image is uploaded, clear the old results and start fresh.

### Changes

**`src/components/WorkflowPanel.tsx`:**
- `handleImageRemove`: Only clear the image and set phase to "upload". Do NOT reset `results`, `sceneFrames`, `elementDirections`, or `description`/`model`.
- `handleImageSelect`: Keep current behavior — clear results and scene data when a NEW image is selected (fresh start with new input).

This means:
- Remove image → results stay visible, user can still copy them
- Upload new image → results clear, workflow restarts cleanly

