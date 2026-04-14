

## Plan: Collapsible Description & Presets Section

### Problem
After uploading images, the "Describe Your Vision" textarea and preset chip categories take up too much space. The user wants them hidden by default with a toggle to show/hide.

### Changes

**`src/components/ConfigPanel.tsx`**
- Wrap the description textarea and preset groups inside a collapsible section
- Add a toggle button/icon (e.g. `ChevronDown`/`ChevronUp` or `Settings2`) labeled something like "Advanced Options" or "Describe Your Vision"
- Default state: collapsed (hidden)
- Keep the Target AI Model selector always visible (outside the collapsible)
- Use the existing `Collapsible` component from `@/components/ui/collapsible`

### UI Layout
```text
┌─────────────────────────────┐
│ [▶ Describe Your Vision]    │  ← clickable toggle, collapsed by default
│                             │
│ Target AI Model: [dropdown] │  ← always visible
└─────────────────────────────┘

When expanded:
┌─────────────────────────────┐
│ [▼ Describe Your Vision]    │  ← toggle open
│ ┌─────────────────────────┐ │
│ │ Textarea                │ │
│ └─────────────────────────┘ │
│ 🎥 Camera: [chips...]      │
│ ✨ Transitions: [chips...]  │
│                             │
│ Target AI Model: [dropdown] │
└─────────────────────────────┘
```

### Technical Details
- Import `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible`
- Add `useState` for open/closed state (default `false`)
- Use `ChevronRight`/`ChevronDown` icon from lucide-react for the toggle indicator

