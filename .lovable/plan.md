

# Fix Scene Breakdown: Group Elements by Frame

## Problem

When using **Two Frames** or **Multi-Shot**, the scene breakdown shows all elements in one flat list. Users can't tell which element belongs to which frame — making it confusing and unusable for multi-image workflows.

## Solution

Group scene elements by frame so each image's elements are clearly labeled and visually separated.

```text
┌─ Frame 1: Start Frame ─────────────────┐
│ 🎯 Subject: Woman standing             │
│ 🏙 Background: Park at dawn            │
│    [Lock] [Move] [+ Note]              │
└─────────────────────────────────────────┘

┌─ Frame 2: End Frame ───────────────────┐
│ 🎯 Subject: Woman walking away         │
│ 🏙 Background: Park at sunset          │
│    [Lock] [Move] [+ Note]              │
└─────────────────────────────────────────┘
```

## Changes

### 1. Update edge function: `analyze-scene`
- Update the AI system prompt to analyze **each image separately** and return elements grouped by frame index
- Response structure changes from `{ elements: [...] }` to `{ frames: [{ frameIndex: 0, elements: [...] }, { frameIndex: 1, elements: [...] }] }`
- For single-image workflows, returns one frame (backwards compatible)

### 2. Update `SceneBreakdown.tsx`
- Accept a `frames` array instead of flat `elements`
- Render each frame as a labeled section with a header (e.g., "Start Frame", "End Frame", or "Frame 1", "Frame 2")
- Show the uploaded image thumbnail next to each frame header for quick reference
- Each frame's elements listed underneath with the same Lock/Move/Note controls

### 3. Update `WorkflowPanel.tsx`
- Pass frame labels (from workflow type) and image previews to `SceneBreakdown`
- Update state shape: `sceneElements` becomes `sceneFrames` (array of frame objects)
- Pass grouped breakdown to `generate-prompt`

### 4. Update `generate-prompt` edge function
- Accept the frame-grouped breakdown and inject per-frame direction into the prompt

### Files

| Action | File |
|--------|------|
| Edit | `supabase/functions/analyze-scene/index.ts` |
| Edit | `src/components/SceneBreakdown.tsx` |
| Edit | `src/components/WorkflowPanel.tsx` |
| Edit | `supabase/functions/generate-prompt/index.ts` |

No database or secret changes needed.

