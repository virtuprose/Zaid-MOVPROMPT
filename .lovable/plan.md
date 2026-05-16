## Goal

Replace the current Director chat empty state (faded watermark logo + flat starter chips) with a hero composition inspired by the reference image, adapted to VidoPrompt's dark cinematic theme. Keep all chat logic intact — this is a presentation-only change to `DirectorChat.tsx`.

## What the user will see (empty state only)

```text
 ┌────────┐   {FirstName}, what are we
 │  LOGO  │   filming today?
 │ (anim) │
 └────────┘

 ┌─────────────────────────────────────────────┐
 │  Pitch me your scene…                       │
 │                                             │
 │  [+]  [✦ Director]                  [ ↑ ]  │
 └─────────────────────────────────────────────┘

  [🎬 Cinema]  [🎭 UGC]  [🗂 Storyboard]  [✨ Animate]
  ──────────                                          
  → Slow dolly-in on a neon-lit ramen bar at dusk
  → Anamorphic 2.39:1 chase through rain-slick alley
  → Golden-hour aerial sweep over coastal cliffs
```

Once the user sends the first message, the layout reverts to the existing chat stream (scroll area + composer at bottom). Nothing about message rendering, streaming, approvals, or sessions changes.

## Scope (frontend only)

Single file: `src/components/director/DirectorChat.tsx`.

No backend, no model catalog, no agent prompt changes. No new dependencies — animations use existing Tailwind `motion-safe:` utilities and `framer-motion` if already in the project; otherwise pure CSS keyframes added in `index.css`.

## Implementation outline

1. **Greeting** — derive first name from `user?.user_metadata?.full_name` or the local-part of `user?.email`; fallback to "Director". Use Space Grotesk display font, large size (text-3xl→text-5xl responsive), tight tracking. No retro pixel font — keep brand typography.

2. **Animated logo block** — render `logoMark` at 96–112px inside a rounded-2xl card with:
   - subtle floating loop (translateY ±4px, 4s ease-in-out infinite)
   - cyan glow pulse (box-shadow scale on primary color, 3s)
   - faint conic/grid background already on brand
   - `motion-safe:` gating so reduced-motion users see a static mark
   - swaps to a "listening" state (slightly faster pulse) when the textarea has focus

3. **Category tabs** — 4 pill buttons with lucide icons:
   - Cinema (`Film`), UGC (`Megaphone`), Storyboard (`LayoutGrid`), Animate (`Sparkles`)
   - Active tab uses primary border + soft cyan glow; inactive uses muted border with hover lift
   - State: `activeCategory` local to the empty state

4. **Suggestion list** — 3 prompts per category (12 total, defined as a const map). Each row is a left-aligned button with `ArrowRight` icon, muted text that brightens on hover, no border. Clicking sets `input` (same behavior as current STARTERS).

5. **Layout shift** — when `isEmpty`, render the hero (logo + greeting + composer + tabs + suggestions) centered in the chat area instead of the current scroll container watermark. When not empty, current scroll layout is used unchanged. Composer component is reused as-is in both states; presence header is hidden in the empty state for cleaner first impression.

6. **Polish on existing starter chips** — the previous flat STARTERS chip row is removed (replaced by the new tabs + suggestions).

## Out of scope

- Renaming, route changes, history sidebar
- Composer internals, model picker styling beyond what's already there
- Logo redesign (reuses `@/assets/logo-mark.svg`)
- Any agent/edge-function work

## Acceptance

- Empty state matches the reference layout: logo top-left of greeting, composer below, tabs row, suggestion list.
- Logo visibly animates (float + glow) and respects `prefers-reduced-motion`.
- Switching tabs swaps the 3 suggestions instantly; clicking a suggestion fills the composer.
- After first send, UI returns to the existing chat stream with zero regressions.
