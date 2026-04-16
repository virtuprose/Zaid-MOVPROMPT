

# Scene Breakdown & Interactive Direction Feature

## Overview

A two-phase workflow: after uploading, the user clicks **"Analyze Scene"** to get an AI-powered breakdown of scene elements. They then mark each element as **Lock** (static) or **Move** (animate), add optional notes, and proceed to generate the final prompt with full context.

## UX Flow

```text
Upload Image → [Analyze Scene] → Scene Breakdown cards appear
  Each card: category + description + Lock/Move toggle + optional note
    ↓
User directs elements → ConfigPanel + [Generate Cinematic Prompt]
```

## Technical Plan

### 1. Create edge function: `supabase/functions/analyze-scene/index.ts`

- Same auth + rate-limiting pattern as `generate-prompt`
- Receives base64 image(s), calls Lovable AI (gemini-2.5-flash) with a system prompt instructing structured scene decomposition
- Uses tool calling to return: `{ elements: [{ id, category, description, details }] }`
- Categories: Subject, Background, Lighting, Atmosphere, Objects, Colors

### 2. Create component: `src/components/SceneBreakdown.tsx`

- Receives `elements` array and `directions` state (lock/move/note per element)
- Each element rendered as a card with:
  - Category icon + label + AI description
  - Toggle group: Lock (lock icon, muted style) / Move (play icon, highlighted cyan)
  - Expandable note input (click "+ Note" to reveal textarea)
- Default state: all elements set to "move"
- Animated entry with framer-motion stagger

### 3. Edit `src/components/WorkflowPanel.tsx`

- Add state: `sceneElements`, `elementDirections`, `isAnalyzing`, `phase` (upload | breakdown | generate)
- Phase 1: After image upload, show "Analyze Scene" button instead of directly showing ConfigPanel
- Phase 2: After analysis, show SceneBreakdown + ConfigPanel + "Generate" button
- "Re-analyze" option to redo the breakdown
- Pass `sceneBreakdown` (elements + directions) to `generate-prompt`

### 4. Edit `supabase/functions/generate-prompt/index.ts`

- Accept optional `sceneBreakdown` field in request body
- When present, inject into user message:
  ```
  Scene Breakdown (user-directed):
  - Subject: "Woman in red dress" → LOCK (keep static) | Note: "..."
  - Background: "City skyline" → MOVE (animate) | Note: "add rain"
  ```
- This gives the AI precise lock/move intent per element

### Files Summary

| Action | File |
|--------|------|
| Create | `supabase/functions/analyze-scene/index.ts` |
| Create | `src/components/SceneBreakdown.tsx` |
| Edit | `src/components/WorkflowPanel.tsx` |
| Edit | `supabase/functions/generate-prompt/index.ts` |

No database changes needed. No new secrets required (uses existing LOVABLE_API_KEY).

