
## Problem
After generation, users see many fields (Main Prompt, Negative Prompt, Camera Tags, Audio Block, Reference Guidance, Shot Structure, Camera Suggestions, Model Notes) — and don't know which one to actually paste into the target video model. Every field has the same visual weight and its own copy button, so the "primary" output gets lost.

## Solution: Make the "what to copy" obvious

Three coordinated changes in `src/components/ResultsPanel.tsx` (plus 2 new translation keys in `en.ts` / `ar.ts`):

### 1. Promote the Main Prompt as "the one to paste"
- Make the Main Prompt card visually dominant: larger padding, stronger primary border/glow, and a prominent **"Copy this into [Model]"** primary button (full-width, with paste icon) instead of the tiny corner copy icon.
- Add a one-line helper above it: *"This is what you paste into the model. Other sections are optional refinements."*

### 2. Demote secondary fields
- Group Negative Prompt + model-specific blocks (Audio, Camera Tags, Reference Guidance, Shot Structure) under a collapsible **"Optional refinements"** section, collapsed by default.
- Camera Suggestions + Model Notes go under a second collapsible **"Director's notes (reference only)"** — these are guidance, not paste-able.
- Each still has its small copy button when expanded.

### 3. Clarify the "Copy All" button
- Rename to **"Copy full package"** with a tooltip explaining it copies everything formatted, for users who want the whole bundle.
- Keep the prominent single-field copy as the default action.

### Visual hierarchy (result)
```text
┌─ Shot 1 ──────────────────────────┐
│ 📐 16:9   ⏱ 5s                    │
│                                   │
│ ┌── MAIN PROMPT ─────────────┐   │ ← big, glowing, primary
│ │ "A cat walks through..."   │   │
│ │ [ 📋 Copy into Veo 3.1 ]   │   │ ← full-width primary button
│ └────────────────────────────┘   │
│                                   │
│ ▸ Optional refinements (4)       │ ← collapsed
│ ▸ Director's notes               │ ← collapsed
└───────────────────────────────────┘
```

### Files touched
- `src/components/ResultsPanel.tsx` — restructure card layout, add collapsibles (already in `ui/collapsible.tsx`)
- `src/i18n/translations/en.ts` + `ar.ts` — add keys: `results.copyIntoModel`, `results.pasteHint`, `results.optionalRefinements`, `results.directorsNotes`, `results.copyFullPackage`

No backend changes. No new dependencies.
