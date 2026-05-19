## Confirm credits before any generation

Show a confirmation card with the credits cost before running an image or video generation. Already implemented for video renders via `requestApproval`. Add the same for image generations (storyboard panels, key frames, character/product sheets, single-panel regenerates).

### What's already in place
- `ApprovalContext` + `InlineApprovalCard` / `BottomApprovalBar` show "Approve / Cancel" with a credit cost and optional **Always allow** toggle.
- Video flow in `PromptResultCard.tsx` already gates `generateVideo` behind `requestApproval` (cost 2.125, always-allow key per model).

### Changes — image generations only
**`src/components/director/DirectorChat.tsx`**
- Import nothing new (already imports `useApproval`).
- At the top of `runImageGeneration` (line 325), before any bubble mounting / `setBusy`, compute:
  - `count` = `payload.per_shot_prompts?.length ?? payload.count ?? 1` for `storyboard_panels`, `1` otherwise.
  - `perImage` = `5` credits (matches the edge function's `priceFor("image_generation", 5)` fallback).
  - `cost` = `count * perImage`.
  - `label` = `"Storyboard panels (N)"` | `"Character/Product sheet"` | `"Key frame"` | `"Regenerate panel"` (when `shot_index` present).
  - `items`: for storyboard, first 3 per-shot prompts truncated to 80 chars + "+N more" sentinel; for sheet/key-frame, the prompt truncated.
  - `alwaysAllowKey`: stable per mode (`approval:image:storyboard_panels`, `approval:image:character_sheet`, `approval:image:single_panel`, `approval:image:single_panel_regen`).
- Wrap the existing body in a Promise that resolves on `onConfirm` (proceeds with current logic) and resolves with `undefined` on `onCancel` (no-op). Use `requestApproval(...)` from `useApproval()` to surface the gate.
- Callers at lines 520, 578, 894 already wrap with `setBusy(true)` + `finally setBusy(false)`. The early-cancel path returns normally so `setBusy(false)` still fires.

**Cost source**
- Hard-code `5 credits/image` in the UI gate (matches existing fallback). No backend change. If `priceFor` is overridden remotely, the actual deduction stays correct on the server; the UI estimate may drift by remote-config — acceptable.

### Out of scope
- No change to video confirmation (already implemented).
- No change to the credit RPCs, the chat-reply free behavior, or per-message cost chip.
- No new "always allow" UI beyond the existing toggle.
- No price catalog / fetch of `priceFor` to the client.

### File touched
- `src/components/director/DirectorChat.tsx` only.
