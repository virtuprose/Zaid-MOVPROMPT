## Goal
Add a Single ↔ Multi-shot toggle to **Seedance 2.0** and **Seedance 2.0 Fast**, with a default of **9 shots** in multi-shot mode (matching what users typically upload as elements).

## Current behavior
- Seedance 2.0 uses `@Element` references (3–10) and auto-scales shot count to the element count.
- It has no Single↔Multi-shot toggle, so users can't get multi-shot output without uploading elements.

## Changes

### 1. `src/lib/modelContracts.ts`
In the `seedance-2.0 / seedance-2.0-fast` branch, add multi-shot support alongside the existing element references:
```ts
supportsMultiShotToggle: true,
multiShotCount: 9,
```
Keep `supportsElementReferences: true` and `maxElements: 10` so both flows still work.

### 2. `src/components/WorkflowPanel.tsx` (no logic rewrite needed)
The existing multi-shot toggle UI (`modeToggleBlock`) already renders whenever `contract.supportsMultiShotToggle` is true. The element-count auto-scaling we added last turn already does `max(contract.multiShotCount, elementsPayload.length)`, so:
- 0 elements + multi-shot ON → 9 shots
- 9 elements + multi-shot ON → 9 shots
- 10 elements + multi-shot ON → 10 shots (capped)

Verify the toggle and elements grid don't visually collide; if they do, hide the multi-shot toggle when `elements.length > 0` (elements implicitly drive the count anyway).

### 3. Edge function `supabase/functions/generate-prompt/index.ts`
No changes needed — `resolvedShotCount` already honors the `multiShotCount` sent from the client and the `max_tokens: 16000` budget covers 9 shots.

### 4. Verify
- Open Seedance 2.0 → confirm new "Single / Multi-shot" toggle appears.
- Toggle Multi-shot, no elements uploaded, generate → expect 9 shots in results.
- Upload 4 elements + Multi-shot → expect 9 shots (9 > 4).
- Upload 10 elements → expect 10 shots.
- Spot-check an Edge Function log entry to confirm `resolvedShotCount=9`.

### Files to edit
- `src/lib/modelContracts.ts`
- `src/components/WorkflowPanel.tsx` (only if visual conflict between toggle and elements grid)