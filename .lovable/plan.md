

## Add More Camera Presets

Currently the Camera category has 10 chips. I'll expand it with additional cinematic camera techniques commonly used in AI video generation.

### Changes

**File: `src/components/ConfigPanel.tsx`**

Update the Camera chips array from 10 to ~20 entries by adding:
- Arc shot, Push in, Pull out, Orbit, Static lock, Rack focus, Dutch angle, Bird's eye, Worm's eye, Zoom in

These are all standard cinematography terms that Gemini 2.5 Pro already understands and will incorporate into prompt generation.

