

# Improve Mobile Responsiveness

## Overview
Optimize the layout for small screens (< 640px) across four areas: hero, workflow tabs, upload zones, config/results panels.

## Changes

### 1. Index.tsx — Hero & Tabs
- Reduce hero title from `text-4xl` to `text-3xl` on mobile, reduce bottom margin
- Reduce container padding from `py-12` to `py-6` on mobile
- Guide steps grid: already responsive (`sm:grid-cols-3`), no change needed
- Tab triggers: reduce padding, use icon-only on very small screens with label below at smaller text

### 2. ImageUploadZone.tsx — Upload Area
- Reduce `aspect-video` to a smaller fixed height on mobile (`min-h-[180px]` instead of aspect-video constraint)
- Reduce padding from `p-8` to `p-5` on mobile
- Reduce `max-h-[400px]` on preview image to `max-h-[250px]` on mobile

### 3. ConfigPanel.tsx — Preset Chips
- Chips are already flex-wrap, should work fine
- Limit visible chips on mobile with horizontal scroll option for the chip groups

### 4. ResultsPanel.tsx — Results Cards
- Make header buttons stack or use icon-only on mobile
- Reduce card padding on mobile
- Camera/Model notes grid already uses `grid-cols-1 sm:grid-cols-2` — good

### 5. WorkflowPanel.tsx — Generate Button
- Reduce button padding on mobile

## Technical Details

| File | Key Changes |
|------|-------------|
| `src/pages/Index.tsx` | Responsive title size, padding, tab trigger sizing |
| `src/components/ImageUploadZone.tsx` | Smaller upload zone height/padding on mobile |
| `src/components/ResultsPanel.tsx` | Compact header buttons on mobile |
| `src/components/WorkflowPanel.tsx` | Responsive button sizing |

All changes use Tailwind responsive prefixes — no new dependencies.

