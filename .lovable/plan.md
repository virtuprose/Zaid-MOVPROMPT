# Make the Polish popover clear and usable

The popover that opens from the amber Polish (wand) button on each generated panel is currently confusing: the title "Polish panel 3" is jargon, the chips use cryptic abbreviations (WS, MS, MCU, CU, ECU, OTS), the type is tiny (10.5px), and there's no explanation of what Polish actually does. We'll fix the wording, expand the abbreviations, give each section a one-line hint, and tighten the visual hierarchy — all in `GeneratedImageCard.tsx` (the `PolishPanelPopover` + `Chip` / `ChipGroup` helpers).

## What changes

**1. Header — explain what Polish does**
- Title: **"Refine this shot"** (instead of "Polish panel 3"), with a small muted suffix "· Panel 3".
- Subtitle rewritten in plain language: *"Adjust any of these to re-render just this panel. Leave a row untouched to keep it the same."*

**2. Abbreviations → human labels (with the short code as a hint)**
Replace the `SHOT_CHIPS` flat strings with `{ label, hint }` pairs so each chip shows the full name and a tiny code below / in a tooltip:

```text
Wide shot (WS)        Medium shot (MS)       Medium close-up (MCU)
Close-up (CU)         Extreme close-up (ECU) Over-the-shoulder (OTS)
Insert               Low angle              Eye level
High angle           Dutch tilt
```

Camera move, Lighting and Mood already use readable labels — keep them but group "angle" chips visually separate from "framing" chips inside the Shot type section.

**3. Section headers with one-line guidance**
Each `ChipGroup` gets a short helper line under the title:
- **Framing & angle** — "How tight is the camera, and where is it?"
- **Camera move** — "How does the camera move during the shot?"
- **Lighting** — "What's the dominant light source and quality?"
- **Mood** — "What should the shot feel like?"

**4. Visual fixes**
- Bump chip text from `text-[10.5px]` to `text-xs` (12px) and chip padding to `px-2.5 py-1` for tap comfort.
- Active chip uses the existing primary token; add a subtle ring so the selection is obvious at a glance.
- Add a small "Clear" link at the right of each section header that appears only when that section has a selection, so users can reset one dimension without hunting.
- Widen the popover from `w-80` to `w-[22rem]` and add `max-h-[70vh] overflow-y-auto` so all four sections fit on smaller screens without the action row getting clipped.
- Footer: keep Cancel + primary action, but rename **"Polish shot"** → **"Re-render this shot"** (clearer outcome) and add a tiny muted note on the left: *"Only this panel changes."*

**5. Empty-state affordance**
If the user opens the popover and applies with nothing selected, show an inline hint instead of silently re-rendering: *"Pick at least one change, or close to leave the shot as-is."* (Disable the primary button until at least one chip is active.)

## Files touched
- `src/components/director/GeneratedImageCard.tsx` — `Chip`, `ChipGroup`, `PolishPanelPopover`, `SHOT_CHIPS` data shape. No other files.

## Out of scope
- The `RelightSequencePopover` (sequence-wide relight) — only mentioned for reference. If you want the same clarity pass applied there too, say so and I'll extend the plan.
- Backend prompt string sent to `generate-reference-image` stays the same (still emits "shot type → Wide shot (WS)" etc., which the model already handles).
