## Goal
On the **Before / After** preset, the "After" reveal currently lands in the final second of the generated ad. Move the reveal to the **midpoint** of the video so viewers spend roughly the first half on "Before" and the second half on "After".

## Change
Edit the `before-after` preset `fragment` in `src/lib/marketingStudio.ts` (line 148) to lock the reveal timing explicitly.

Updates to the prompt:
- Add an explicit **timing rule** at the start: "Split the total duration in half. Sequences 1–3 (Problem + Catalyst + Process) occupy the FIRST 50% of the clip. The Reveal Transition lands exactly at the midpoint (50% mark). Sequences 5–6 (Confident After + Transformation Hero) occupy the FINAL 50%."
- Reword sequence (4) The Reveal Transition to say "executed at the exact midpoint of the video, not the end".
- Reword sequence (6) The Transformation Hero to hold for the full second half ending with the split-screen final frame, not just a last-second flash.
- Keep all other sequence descriptions, style directives, and cinematography language intact.

## Why
Seedance is honoring the sequence order but compressing the After into the tail of the clip. Adding explicit percentage-based timecodes ("first 50%", "midpoint", "final 50%") inside the fragment forces the model to allocate equal screen time to Before and After, regardless of duration (5s, 8s, 10s).

## Out of scope
- No changes to provider routing, video model, or generation pipeline.
- No UI changes.
- Other presets untouched.