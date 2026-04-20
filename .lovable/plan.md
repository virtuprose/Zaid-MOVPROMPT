
The user wants the supplemental sections (Negative Prompt, Audio Direction, Shot Structure, Camera Suggestions) merged INTO the visible main prompt area — not just into the copy output, and not shown as separate cards/sections below.

## Plan — Inline supplemental sections into Main Prompt display

### Changes to `src/components/ResultsPanel.tsx`

**1. `MainPromptHero` — render the merged content visibly**
- Build a `displaySections` array from the parsed scripted prompt (or a single block if not scripted), then append:
  - `[NEGATIVE PROMPT]` if meaningful
  - `[AUDIO DIRECTION]` if meaningful
  - `[SHOT STRUCTURE]` if meaningful
  - `[CAMERA SUGGESTIONS]` if meaningful
- These appended sections render as additional collapsible blocks via the existing `ScriptedPrompt` component (consistent styling, collapsible, copyable per-section).
- For non-scripted prompts: show the original paragraph, then render the appended sections below it as the same collapsible blocks.
- Section count badge updates to reflect total (script sections + appended).
- The "Copy Main Prompt" button keeps copying the full aggregated text (already implemented).

**2. `ShotCard` — remove duplicates from "Optional Refinements"**
- Strip `negativePrompt`, `audioBlock`, `shotStructure` from the `refinements` array (they now live inside the hero).
- Keep only: `cameraTags`, `referenceGuidance` in refinements.
- If refinements becomes empty, hide the entire "Optional Refinements" collapsible.

**3. `ShotCard` — remove `cameraSuggestions` from "Director's Notes"**
- Director's Notes now only contains `modelNotes`.
- Update the grid from `sm:grid-cols-2` to single column.
- Update the count badge from `2` to `1`.

### Files touched
- `src/components/ResultsPanel.tsx` (only)

No translations, backend, or schema changes. Frontend-only — requires Publish to reach live users.
