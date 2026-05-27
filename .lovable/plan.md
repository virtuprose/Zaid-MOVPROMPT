## Goal

Make the "Analyze Scene" and "Skip & Generate Now" actions feel like a natural next step of the upload flow (sitting right under the Upload Image + Pick AI Model cards), and explain what each does on hover.

## Changes

### 1. Move the CTA out of the fixed sticky bar (when on upload phase with images ready)

In `src/components/WorkflowPanel.tsx`:

- Stop rendering the Analyze + Skip block inside `mobileStickyCta` (the `fixed inset-x-0 bottom-0` bar) for the `phase === "upload"` case.
- Instead, render that same block **inline** as part of the main workflow content, immediately after the Upload Image / Pick AI Model cards — wrapped in the same card styling (rounded border, subtle background, matching padding) so it visually reads as the next step in the stack rather than a detached toolbar pinned to the page edge.
- Keep the sticky bar behavior for the `breakdown` / `generate` phases (unchanged).
- The "Free — no credits charged" hint stays directly under the button.

Result: on desktop and mobile the user scrolls through Upload → Model → Analyze, all in one connected column.

### 2. Add hover tooltips describing each action

Wrap the two controls in shadcn `Tooltip` (already used elsewhere in the project):

- **Analyze Scene** tooltip: short copy explaining it sends the uploaded image(s) to the AI Director to break the scene down into shot, subject, lighting, lens, mood, etc., then produces an editable prompt — free, no credits used.
- **Skip & Generate Now** tooltip: explains it bypasses the analysis step and jumps straight to writing a prompt from scratch using just the model defaults, for when the user already knows what they want.

Tooltip copy added to both `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts` under new keys (e.g. `wp.analyzeSceneTooltip`, `wp.skipGenerateTooltip`) so RTL/Arabic users get the same explanation.

## Out of scope

- No changes to analyze logic, models, or backend.
- No changes to the breakdown/generate sticky bar.
- No copy changes to the button labels themselves.
