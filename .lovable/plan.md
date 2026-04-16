

# Add Skip Analysis Button & Analyze Scene Explanation

## Changes

### File: `src/components/WorkflowPanel.tsx`

**1. Add explanation text** above the "Analyze Scene" button (in the `phase === "upload"` section):
- Short muted paragraph: *"AI will break down your scene into individual elements (subject, background, lighting, atmosphere) so you can control exactly what stays still and what moves."*

**2. Add "Skip Analysis" button** next to the "Analyze Scene" button:
- Secondary/ghost variant, labeled "Skip — Go Straight to Generate"
- On click: skip to showing ConfigPanel + Generate button directly (set `phase` to `"breakdown"` with empty `sceneFrames`, so the breakdown section is skipped but ConfigPanel and Generate appear)
- Need a small logic adjustment: when `phase === "breakdown"` and `sceneFrames` is empty, show only ConfigPanel + Generate (no SceneBreakdown cards)

**3. Layout**: Stack the two buttons horizontally — "Analyze Scene" (primary) on left, "Skip Analysis" (ghost/outline) on right, with the explanation text centered above them.

Single file edit. No backend changes.

