# Fill the Director gutters — widen chat + right context rail

## Goal
Kill the ~300px of dead space on either side of the Director chat without breaking the conversational flow. Keep the chat centered and readable, but bump its width and add a persistent **right rail** that holds the four context modules you picked.

## Layout change

Current grid:
```text
[ 240px session sidebar ][ chat capped at max-w-3xl, centered in remaining space ]
```

New grid (≥1280px):
```text
[ 240px sessions ][ chat max-w-4xl (~896px), left-aligned ][ 360px right rail ]
```

- Below `lg`: right rail collapses into a floating button (bottom-right) that opens it as a Sheet, so mobile/tablet are unchanged.
- Above `lg`: rail is pinned, user can collapse it to a 48px icon strip via a chevron.
- Chat bumps from `max-w-3xl` → `max-w-4xl` (storyboards finally breathe; in-stream cards like aspect picker get ~25% more room).

## Right rail — 4 stacked sections

Single scrollable column, each section is a collapsible card (all open by default, state persisted in localStorage). Order top→bottom:

### 1. Quick Actions
4–6 one-click chips that dispatch the same intents the Director would:
- "Build storyboard from last image"
- "Animate last frame" (opens existing `AnimatePanelDialog`)
- "Generate variants" (re-runs last image prompt with seed shuffle)
- "Export all prompts" (downloads .txt/.json of session)
- "New shot" (jumps to free-chat with a fresh prompt scaffold)

Disabled state when no relevant context exists (e.g. Animate disabled until first image lands).

### 2. Storyboard / Shot Outline
Mini-map of the current storyboard.
- One row per panel: thumbnail (40×40), shot # + one-line caption, status dot (queued / rendering / done / failed).
- Click → smooth-scrolls the chat to that panel and pulses its border.
- Empty state: "No storyboard yet — ask the Director to build one."
- Reads from existing storyboard bubbles in `DirectorChat` message stream; no new backend.

### 3. Reference Tray
Thumbnail grid (3 cols) of every image this session — uploaded refs + generated frames.
- Source: scans `messages` for `image` / `attachment` / `storyboard_panel` bubble types.
- Drag → drops into Composer as a new attachment (reuses `AttachmentDropzone` handler).
- Click → opens lightbox preview.
- Filter pills: All / Uploaded / Generated.
- Empty state: "Drop or generate something — it'll land here."

### 4. Session Health
Compact stat strip:
- Credits remaining (from existing credits hook).
- Current model (Gemini 3.1 Pro Preview).
- Attachments staged in composer (count).
- Session token estimate (rough char/4 estimate of message history).
- Tiny "Reset session" button.

## Files

**New**
- `src/components/director/RightRail.tsx` — shell + collapse logic + sheet wrapper.
- `src/components/director/rail/QuickActionsCard.tsx`
- `src/components/director/rail/StoryboardOutlineCard.tsx`
- `src/components/director/rail/ReferenceTrayCard.tsx`
- `src/components/director/rail/SessionHealthCard.tsx`
- `src/components/director/rail/RailSection.tsx` — shared collapsible wrapper (header + chevron + body).

**Edited**
- `src/pages/Director.tsx` — grid becomes `lg:grid-cols-[240px_1fr_360px]`, mounts `<RightRail/>`, passes shared state (messages, scrollToBubble callback, composer dispatch).
- `src/components/director/DirectorChat.tsx` — bump outer chat container `max-w-3xl` → `max-w-4xl`; expose a `scrollToBubble(id)` imperative handle for the outline; expose a `dispatchAttachment(asset)` handler for drag-drop from tray.
- `src/components/director/Composer.tsx` — accept dropped reference asset from the tray.

**No backend changes.** Pure presentation + existing client state.

## Visual

- Rail bg: `hsl(var(--card)/0.4)` with `border-l border-border/40`, matches session sidebar weight.
- Section headers: Space Grotesk, uppercase, 11px, muted-foreground.
- Cards inside rail: rounded-xl, `bg-card/60`, subtle inner glow on hover.
- Cyan accent for active states (selected outline panel, drag-hover on tray).
- Smooth 200ms collapse animation (existing `transition-all`).

## Tradeoffs / out of scope

- Not rebuilding the chat as split-pane (your original idea) — outline + reference tray give you the spatial overview without breaking conversational flow.
- Not adding a left third column — keeps cognitive load down and works on 1366px laptops.
- Quick Actions intentionally limited to 4–6 — more would become a junk drawer; we can add a "More…" menu later.
- No new analytics / persistence beyond localStorage collapse state.

## Verification

1. On a 1600px screen: gutters gone, chat at 896px, rail at 360px, session sidebar at 240px.
2. On a 1280px screen: same three columns, rail readable.
3. On <1024px: rail collapses to floating button → opens as Sheet.
4. Generate an image → it appears in Reference Tray within the same tick.
5. Build a storyboard → outline lists every panel, click jumps + pulses.
6. Click "Animate last frame" → opens `AnimatePanelDialog` with the correct frame preloaded.
7. Collapse rail → chat re-centers smoothly, state persists across reloads.
