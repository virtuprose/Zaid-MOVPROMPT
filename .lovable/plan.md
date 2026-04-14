

## Add How-To Guide at the Top

### What
Add a collapsible tutorial guide between the hero header and the workflow tabs, showing step-by-step instructions for using MovPrompt.

### Design
- A styled card with a **Book/HelpCircle icon** and "How to Use" title
- Uses the `Collapsible` component so users can expand/collapse it
- 3 numbered steps with icons matching each action:
  1. **Choose a Workflow** — Pick Single Frame, Two Frames, or Multi-Shot
  2. **Upload Your Image** — Drag & drop or click to upload your reference frame(s)
  3. **Generate & Copy** — Hit generate, review your cinematic prompt, and copy it
- Matches the dark cinematic theme with `bg-card border-border` styling
- Animated entry with framer-motion, appearing after the hero

### Changes

**File: `src/pages/Index.tsx`**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from UI
- Import `BookOpen`, `ChevronDown` icons
- Add the guide section between the hero `</motion.header>` and the workflow tabs `<motion.div>`
- Use local state to toggle open/closed (default: collapsed)

Single file change, ~40 lines added.

