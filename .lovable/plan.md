# Hover preview for brand & character chips

When hovering the Bose / Maya chips in the composer (MarketingStudio), show a floating preview above the chip with the full reference image at its native aspect ratio.

## What changes

`src/pages/MarketingStudio.tsx` — the two chip blocks at lines 586–605 (brand) and 627–646 (character).

Wrap each chip in a `HoverCard` (shadcn, already used in `PresetCard`):

- `HoverCardTrigger` — the existing chip div (unchanged styles).
- `HoverCardContent` — `side="top"`, `align="start"`, `sideOffset={8}`, width ~`w-64`, padded `p-2`, rounded, with:
  - The full image (`brandKit.logo_url` or `characterKit.reference_url`) rendered with `object-contain`, `max-h-72`, preserving native aspect ratio on a subtle `bg-black/40` backdrop.
  - A small caption row underneath with the name (`brandKit.name` / `characterKit.name`).
  - Fallback when there's no image: render the existing icon (`Building2` / `UserRound`) centered in the same frame.
- `openDelay={150}`, `closeDelay={80}` for snappy but non-jittery feel.

No popover for the empty-state pickers (those already open a real popover on click) — only the populated chips get the hover preview.

## Out of scope

No backend, schema, or behavior changes. Click-to-detach (X) and existing layout stay identical.
