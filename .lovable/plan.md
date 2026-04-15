

# Redesign "Describe Your Vision" Presets

## What
Replace the current messy flat chip layout with a clean, organized preset system based on the 5 categories from the uploaded file. Use collapsible sub-sections so users can browse by category without being overwhelmed.

## New Categories (from your file)

| Category | Icon | Count | Examples |
|----------|------|-------|---------|
| Basic Camera Control | 🎥 | 14 | General, Static, Handheld, Dolly In/Out, Zoom, Tilt, Focus Change |
| Epic Camera Control | 🎬 | 23 | Dolly Zoom, Crash Zoom, Arc, Crane, FPV Drone, Bullet Time, 360 Orbit |
| Effects | ✨ | 39 | Flood, Freezing, Melting, Diamond, Disintegration, Thunder God, Levitation |
| Catch the Pulse | 🔥 | 17 | Paparazzi, Rap Flex, Catwalk, Boxing, Car Chasing, Glam, Agent Reveal |
| Mix | 🎭 | 13 | Thunder God x Levitation, Action Run x Set on Fire, etc. |

## Design Approach

- Each category is a **collapsible accordion section** (closed by default) inside the "Describe Your Vision" collapsible
- Category header shows icon + name + chip count badge
- Chips inside use the same `Badge` click-to-append behavior
- Chips display in Title Case (e.g. "Dolly Zoom In", not "DOLLY ZOOM IN")
- Keep the textarea at the top for free-form input
- On mobile: horizontal scroll per category. On desktop: flex-wrap

## Visual Hierarchy

```text
▸ Describe Your Vision (optional)
  ┌─────────────────────────────────┐
  │ [textarea]                       │
  └─────────────────────────────────┘
  
  ▸ 🎥 Basic Camera Control (14)
  ▸ 🎬 Epic Camera Control (23)
  ▸ ✨ Effects (39)
  ▸ 🔥 Catch the Pulse (17)
  ▸ 🎭 Mix (13)
```

When expanded:
```text
  ▾ 🎥 Basic Camera Control (14)
    [General] [Static] [Handheld] [Dolly In] [Dolly Out] ...
```

## Files Changed

### `src/components/ConfigPanel.tsx`
- Replace `PRESET_GROUPS` with 5 new category arrays matching the uploaded file
- Replace flat chip rendering with accordion-based collapsible sections per category
- Each section header: icon + label + count badge, clickable to expand
- Chips render inside each section with the same click-to-append behavior
- Use Radix Accordion (already available as `src/components/ui/accordion.tsx`) for clean expand/collapse with only one section open at a time

