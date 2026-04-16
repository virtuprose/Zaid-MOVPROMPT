

# Add Text Descriptions to Preset Groups

Add a short subtitle/description under each preset group name in the accordion to explain what the effects do.

## Changes

**File: `src/components/ConfigPanel.tsx`**

Add a `description` field to each entry in `PRESET_GROUPS`:

- **Basic Camera Control** — "Simple camera movements like panning, tilting, and zooming"
- **Epic Camera Control** — "Advanced cinematic shots: crane, orbit, drone, and dramatic angles"
- **Effects** — "Visual transformations: materials, weather, artistic styles, and motion effects"
- **Catch the Pulse** — "Action and lifestyle scenes: fashion, sports, stage moments"
- **Mix** — "Two effects combined for unique cinematic results"

Display the description as a muted text line below the group label inside each `AccordionTrigger`.

No new dependencies, no images, no storage changes.

