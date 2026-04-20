
## Plan — Hover tooltips on model dropdown items

Users don't know which model fits their scene. Add a short, plain-language description that appears when hovering (or long-pressing on mobile) each model in the dropdown, **before** they select it.

### UX

- Hover any model row in the dropdown → a tooltip pops to the side showing: **one-line strength** + **best-for use cases** + **speed/quality tier**.
- Tooltip appears after ~200ms hover, disappears on leave. Works with keyboard focus too (accessible).
- Mobile: since hover doesn't exist, add a small `info` icon on the right side of each row; tapping it opens the same content as a popover without selecting the model.
- Bilingual: EN + AR, pulled from translation files. Fully RTL-safe.

### Descriptions (EN — AR added in the same keys)

| Model | One-liner |
|---|---|
| Kling 3.0 | Top cinematic motion & realism. Best for hero shots, dramatic action, and character-driven scenes. |
| Kling 3.0 Omni | Multi-subject scenes with richer interaction. Best for group shots and complex staging. |
| Kling 3.0 Omni Edit | Surgical edits to an existing frame — change outfit, object, or lighting without redescribing the scene. |
| Kling 2.6 | Solid single-subject single-action clips. Use when 3.0 is overkill. |
| Kling 2.5 Turbo | Fastest legacy tier. Best for quick iteration and previsualization. |
| Kling O1 Video | Reasoning-heavy choreography, multi-subject, longer arcs. Best for complex narrative beats. |
| Kling O1 Video Edit | O1 reasoning applied to an edit — precise, context-aware modifications. |
| Kling Motion Control | Author the camera path yourself with waypoints. Best for virtual dolly/crane moves. |
| Kling 3.0 Motion Control | Same waypoint camera control on the 3.0 engine. Highest fidelity camera moves. |
| Veo 3.1 Lite | Fast + cheap Veo with native audio. Best for dialogue/ambient short clips. |
| Veo 3.1 Fast | Compact Veo 3.1 with sustained motion emphasis. Quick iterations with audio. |
| Veo 3.1 | Flagship Veo — sustained motion, native synced audio, best-in-class realism for dialogue scenes. |
| Veo 3 Fast | Compact Veo 3 with audio. Good baseline for talking/performance clips. |
| Veo 3 | Full-structure Veo 3 — audio + cinematography for dialogue-driven scenes. |
| Seedance 2.0 Fast | Fast element-reference mode. Best for quick product/character composites with @refs. |
| Seedance 2.0 | Element references + shooting script. Best for choreographed fashion/dance/product. |
| Seedance 1.5 Pro | Stable legacy single-shot shooting script. |
| Seedance Pro | Stitched multi-shot — numbered cuts with continuity. Best for mini-sequences. |
| Seedance Pro Fast | Fast stitched multi-shot. Best for quick multi-cut iteration. |

A 6th row added inside the dropdown for **Any Model** → "Let the AI pick the best fit based on your scene and references."

### Technical approach

1. **Data layer** — extend `ModelOption` in `src/lib/models.ts`:
   ```ts
   interface ModelOption { value: string; label: string; descriptionKey: string; }
   ```
   Each entry gets a `descriptionKey` like `"models.desc.kling-3.0"`. No hardcoded English in the component.

2. **Translations** — add a new `models.desc.*` namespace to both `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts` with one line per model + one for `any`.

3. **Component** — update `src/components/ModelPicker.tsx`:
   - Wrap the `SelectContent` tree in a `TooltipProvider` (already available in the design system).
   - For each `SelectItem`, wrap its children in `<Tooltip>` with `<TooltipTrigger asChild>` on the row content and `<TooltipContent side="right" align="start">` showing the translated description. On RTL, Radix auto-flips `side="right"` to the logical start side; we'll pass `side="right"` and rely on Radix + `dir` attribute set by the language context.
   - Add an `Info` icon (lucide-react) aligned to the end of each row as a visual affordance and mobile tap target. Clicking the icon opens a `Popover` with the same content and stops propagation so the select value doesn't change.
   - Keep the existing variant description strip below the trigger unchanged.

4. **Accessibility** — tooltip wired to the row so keyboard focus (arrow keys inside the Select) also surfaces the description. `aria-describedby` on each item linked to the tooltip content id.

5. **Styling** — tooltip uses existing `popover` tokens, max-width `~280px`, two-line soft wrap, subtle primary-cyan left border to feel cinematic and match the dark theme.

### Files touched
- `src/lib/models.ts` — add `descriptionKey` to each model + to the "any" option handling.
- `src/i18n/translations/en.ts` — add `models.desc.*` keys (20 total).
- `src/i18n/translations/ar.ts` — Arabic equivalents.
- `src/components/ModelPicker.tsx` — tooltip + info-icon popover on each `SelectItem`.

### Out of scope
- No backend changes. No prompt logic changes. Descriptions are UI-only hints.
- No new deps — `@radix-ui/react-tooltip` and `@radix-ui/react-popover` already in the project.

### Verification
- Hover each row on desktop → tooltip appears on the correct side in both EN (LTR) and AR (RTL).
- Tap info icon on mobile → popover opens; tapping the row label still selects the model.
- Keyboard arrow through items → description is read by screen reader.
