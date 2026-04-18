
User wants two contract tweaks:
1. **Seedance 2.0**: change the slot label from generic "Reference image" to... wait, re-reading: "replace to reference image" — currently Seedance 2.0 shows "Single frame" label (because of two-frame toggle). User wants the single-mode label to read "Reference image" instead. Actually checking `modelContracts.ts` — Seedance uses `contract.slot.reference` which already translates to "Reference image". So what does user mean?

Re-reading more carefully: "on seedance 2.0 replace to reference image" — I think user wants to REMOVE the two-frame toggle from Seedance 2.0, making it a single "Reference image" slot only. AND add the toggle to Kling instead.

2. **Kling**: add the "Single frame / Start + End" toggle to Kling variants.

But which Kling variants? Kling 3.0 Omni supports start+end frame officially. Edit and Motion Control don't. Let me ask to be safe — actually the user said "add to kling" generally. I'll scope it to standard Kling variants (3.0, 3.0 Omni, 2.6) and exclude Edit/Motion Control/O1 which have specialized single-input contracts.

Quick clarifying question needed.

## Plan

**Seedance 2.0**: Remove the two-frame toggle. It becomes a single "Reference image" slot like Fast variants. Other Seedance variants (Pro, 1.5 Pro) keep the toggle.

**Kling**: Add the `supportsTwoFrameToggle` to standard Kling variants only (3.0, 3.0 Omni, 2.6). Edit, Motion Control, and O1 keep their specialized single-slot contracts.

### Files
- `src/lib/modelContracts.ts` — flip `supportsTwoFrameToggle` flag: off for `seedance-2.0`, on for standard Kling variants.

That's it. One file change. WorkflowPanel already reads the flag and renders the toggle + 2nd slot dynamically, and `deriveWorkflowType` already returns `"twoframe"` when 2 slots are active — so the backend payload works automatically.

### Quick check
Need to confirm which Kling values count as "standard" — from `src/lib/models.ts` I'll match: `kling-3.0`, `kling-3.0-omni`, `kling-2.6` (exclude anything with `edit`, `motion-control`, `o1`).
