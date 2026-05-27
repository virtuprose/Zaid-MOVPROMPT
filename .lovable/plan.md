## Goal

Replace the flat text-only center nav links (MovPrompt / AI Director / Ads) in `src/components/TopNav.tsx` with the selected **Cinematic Viewfinder** treatment.

## What changes

Scope is the three desktop center nav items only. Logo, search, Library, credits, avatar, and mobile sheet stay untouched.

### Visual treatment

- Wrap the three `NavLink`s in a container pill-bar:  
  `h-10 p-1 rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl`
- Each `NavLink`: `h-full px-4 gap-2.5 rounded-lg` with an icon + uppercase label  
  Typography: `font-display text-[11.5px] font-bold uppercase tracking-[0.15em]`
- **Active state** (amber accent — Ads keeps amber, all active items use amber for a unified viewfinder look):
  - `bg-accent/5 border border-accent/20`
  - Two viewfinder bracket corners absolutely positioned top-left and bottom-right (1.5×1.5, amber/60 borders)
  - Text: `text-accent` + soft text-shadow glow
  - Icon: `text-accent` with `drop-shadow` glow and a blurred amber halo behind it
- **Inactive state**:
  - Text/icon `text-muted-foreground/60`
  - Hover: text → `text-foreground`, icon → `text-primary` with cyan drop-shadow glow
  - 300ms transitions

### Data model

Add an `icon` field to `NAV_ITEMS`: MovPrompt → `Sparkles`, AI Director → `Disc` (already imported), Ads → `Megaphone`. Render the per-item icon in both active and inactive states (the prototype shows icons throughout).

### Out of scope

- Mobile sheet styling
- Logo button
- Right cluster (search, Library, credits, avatar)
- Any routing or label changes
