

# Add More Basic Camera Control Presets

## Changes

**File: `src/components/ConfigPanel.tsx`** — Update the Basic Camera Control chips array.

**Add these new presets:**
- **Natural Movement** — subtle organic camera drift
- **Shake** — handheld shake/vibration effect
- **No Movement** — completely locked-off static frame
- **Pedestal Up** — camera moves vertically up (body rises)
- **Pedestal Down** — camera moves vertically down
- **Swivel** — camera rotates on its axis
- **Follow** — camera follows the subject's movement
- **Reveal** — camera moves to reveal something hidden
- **Drift** — slow gentle lateral float
- **Snap Zoom** — quick abrupt zoom

Updated chips list:
```
"General", "Static", "No Movement", "Natural Movement", "Shake",
"Handheld", "Dolly In", "Dolly Out",
"Pan Left", "Pan Right", "Tilt Up", "Tilt Down",
"Zoom In", "Zoom Out", "Snap Zoom",
"Tracking Shot", "Follow", "Push In", "Pull Out",
"Pedestal Up", "Pedestal Down", "Swivel", "Drift", "Reveal"
```

Single file edit, no backend changes.

