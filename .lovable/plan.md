## Why this happens

When you pick **kling-v3-pro** in the model chooser, the chooser sends `"Target model: kling-v3-pro"` back to the Director, and the Director writes a perfect Kling‑tuned prompt. But when it finally fires the render, the frontend **ignores the picked model** and chooses the provider purely from the reference‑image count:

`src/components/director/DirectorChat.tsx` (line 1350‑1351):
```ts
const provider =
  refCount >= 2 ? "seedance-2.0-ref" : refCount === 1 ? "seedance-2.0" : "seedance-v1-pro";
```

So no matter what you pick, it always renders on Seedance. The Director tool schema for `request_video_generation` also only exposes a broad `provider_preference` ("seedance" | "veo" | "kling" | "any"), never the specific model id, so the picked id is lost on the way back.

## Fix

Carry the user's pick all the way through to `submitVideoJob`.

### 1. Director tool schema — `supabase/functions/director-agent/index.ts`

In the `request_video_generation` tool, add an explicit `model_id` field (the exact playbook id, e.g. `kling-v3-pro`, `veo-3.1`, `seedance-v1-pro`). Update the instructions so that when the user has already picked a model via `ask_model_choice` or named one in their brief, the Director MUST echo that id back in `model_id`. Keep `provider_preference` as a soft fallback.

### 2. Director response type — `src/lib/director/api.ts`

Add `model_id?: string` to the `request_video_generation` variant of the response union.

### 3. Frontend wiring — `src/components/director/DirectorChat.tsx`

- Add a `chosenModelIdRef` (useRef) that records the latest model id the user confirmed in `ModelChoiceCard.onConfirm` (line ~2062), in addition to the existing `send("Target model: …")` call.
- In the `resp.kind === "request_video_generation"` branch (line ~1348), resolve the provider in this priority order:
  1. `resp.model_id` if present and valid (lookup against the known video models registry).
  2. `chosenModelIdRef.current` if set.
  3. The current Seedance heuristic as a last‑resort fallback (only when neither the Director nor the user has picked anything).
- Pass the resolved id as `provider` to `submitVideoJob` and to the video bubble.
- Update the assistant status line to read `Sending this to the {resolvedModel.label} renderer…` instead of the raw provider slug.

### 4. Sanity

`FAL_MODELS` in `supabase/functions/generate-video/index.ts` already maps `kling-v3-pro` → `fal-ai/kling-video/v3/pro/text-to-video`, so once the frontend passes the right provider string the render goes to Kling end‑to‑end. No backend changes needed beyond the schema/prompt update.

### Out of scope

- No change to credit pricing logic (already keyed off model id).
- No change to the storyboard render path (`request_story_render`), which already locks to Seedance 2.0 intentionally.
