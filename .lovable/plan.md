## Problem

The "Pick the scene" dialog (`PresetPickerDialog`) currently stacks three mode toggles (Preset / Real city / Reference image), then category pills, then search, then a conflict warning, then optional inputs, then a 4‑col preset grid with hover overlays and a "Custom scene" card. Three issues:

1. **Confusing hierarchy** — three rows of pill toggles before the user sees a single scene. It's not obvious that "Preset / City / Image" are mutually exclusive ways to answer the same question.
2. **Noisy cards** — heavy dark gradient bar, secondary description text, hover "Click to use" pill, and a corner check badge all fight for attention. Active state uses a hard amber ring that clashes with the cinematic palette.
3. **Ugly thumbnails** — uneven aspect, low‑contrast fallbacks, autoplaying videos with no consistent treatment, gradient overlay too opaque.

## Goal

A calmer, more cinematic picker where the answer to "where does this ad take place?" is one decision, the mode choice fades into the background until needed, and the scene thumbnails carry the page.

## Redesign approach (two-column layout)

```
┌─────────────────────────────────────────────────────────────┐
│  PICK THE SCENE                              [search]    ✕  │
│  Where does the ad take place?                              │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  ◉ Preset    │   [scene]  [scene]  [scene]  [scene]         │
│  ○ Real city │   [scene]  [scene]  [scene]  [scene]         │
│  ○ Reference │   [scene]  [scene]  [scene]  [+ custom]      │
│              │                                              │
│  ── Filter ──│                                              │
│  All         │                                              │
│  Real        │                                              │
│  Stylized    │                                              │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│                                       [Cancel]  [Use scene] │
└─────────────────────────────────────────────────────────────┘
```

- **Left rail (sticky, ~200px)** — radio-style mode picker with a one-line helper under each, then category filter below a divider. Search moves to the header. Replaces the 3 stacked toggle rows.
- **Right pane** — full bleed scene grid (3 cols at this width, 4 at ≥xl). City and Reference modes swap the grid for a single focused panel (large input + suggestions, or upload zone).
- **Conflict banner** only appears when actually conflicting, inline above the right pane.

## Card refresh (the "ugly" part)

- Switch from 3:4 to **4:5** aspect — friendlier, less cramped text area.
- Replace the harsh amber ring with a **soft amber inner border + subtle outer glow** matching the cinematic tokens already in `index.css`.
- Drop the hover "Click to use" pill — replace with a quiet bottom-corner play/check icon.
- Thumbnail treatment: consistent `object-cover`, lighter gradient (transparent → black/70 over bottom 40%), title in Space Grotesk, description hidden until hover/active to clear visual noise.
- Video previews: only autoplay the **hovered** card (and the active one), all others show the poster image — kills the "12 videos playing at once" chaos.
- Custom card visually distinct: dashed border, plus icon centered, no thumbnail.

## Empty / no-match state

Centered illustration + "No scenes match 'rooftop bar' — try a different word or pick a real city" with a one-click "Switch to Real city" CTA.

## Files to touch

- `src/components/marketing/PresetPickerDialog.tsx` — restructure into left rail + right pane, refresh card markup.
- No changes to props / call sites in `src/pages/MarketingStudio.tsx`.

## Open question

Want me to (a) apply this same layout to the other picker that uses `PresetPickerDialog` (the formats dialog, which has no mode toggle and would just get the card refresh), or (b) keep the formats dialog as is and only redesign the scene one? Default if you don't answer: **(a)** — consistent picker across the studio.

After approval I'll generate 3 rendered design directions for the new card + layout so you can pick the exact look before I implement.