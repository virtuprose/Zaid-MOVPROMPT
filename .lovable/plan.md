## Goal

The current "Rendering" state in the AI Director is a flat spinner over a beige shimmer — it doesn't sell the moment. Make the in‑progress video bubble feel like a cinema render bay: alive, branded, and worth waiting for.

Scope: only the loading/queued visual in `src/components/director/VideoBubble.tsx` (lines 69–92). The completed/failed states and all data flow stay untouched.

## New "Render Bay" loading state

A single, layered composition inside the existing rounded card — no new files, no extra deps.

**Layer 1 — Cinematic backdrop**
- Dark base (`bg-[hsl(var(--background))]`) with a slow radial cyan→amber gradient that drifts (CSS `@keyframes` on `background-position`, 8s).
- Subtle 1px scanlines via `repeating-linear-gradient` at very low opacity for a "monitor" feel.

**Layer 2 — Filmstrip frame**
- Top + bottom edges show sprocket‑hole strips (small rounded rectangles in `bg-foreground/10` repeated horizontally) that scroll slowly left→right via `@keyframes` on `background-position` (12s linear infinite). Reads instantly as "film rendering."

**Layer 3 — Light sweep**
- Diagonal highlight (`linear-gradient(110deg, transparent, hsl(var(--primary)/0.18), transparent)`) sweeping across every 2.4s — the existing shimmer, made bolder and on‑brand.
- A second slower amber sweep at half opacity, offset by 1.2s, for depth.

**Layer 4 — Center HUD**
- Replace the plain `Loader2` with a stacked HUD:
  - Pulsing circular badge containing a `Film` icon, ringed by a thin cyan→amber conic gradient that rotates (12s linear).
  - Below: a kinetic status line that cycles through stages every ~2s using a local `useEffect` + `setInterval` driving an index into a labels array: `Warming up the lens` → `Blocking the shot` → `Lighting the scene` → `Rolling camera` → `Rendering frames` → `Final color pass`. Uses `motion-safe:animate-fade-up` style transition between labels.
  - A thin indeterminate progress bar (`bg-primary/40` segment translating across a `bg-foreground/5` track via keyframes) — purely visual, no real progress number.
  - Small monospace **elapsed timer** ("00:14") driven by a `useEffect` counting seconds since the bubble mounted, so the user feels time moving.

**Layer 5 — Footer chip row**
- Replace the muted "It'll appear here when ready" with two tighter chips:
  - Left chip: `Film` icon + provider label (use `findVideoModel(provider)?.label` for a friendly name).
  - Right chip: a pulsing red dot + uppercase `REC` + the elapsed timer mirrored — pure showbiz.

## Motion system

All new keyframes live alongside existing ones in `src/index.css` (filmstrip‑scroll, hud‑sweep, hud‑sweep‑slow, conic‑spin, progress‑indeterminate, dot‑pulse). Tailwind utilities reference them via inline `style={{ animation: '...' }}` to avoid touching `tailwind.config.ts`. Respect `prefers-reduced-motion`: wrap every animation in `motion-safe:` equivalents so reduced‑motion users see a static HUD with just the elapsed timer.

## Tokens

Only existing semantic tokens — `--primary` (cyan), `--accent` (amber), `--background`, `--foreground`, `--muted-foreground`, `--border`. No raw hex anywhere. Works in both dark and light mode.

## Out of scope

- The completed video player, the failed state, the footer action buttons.
- The "Queued" wording change is in‑scope (it'll read "Standing by" before render starts, then transition to the rotating stage labels once `status === "processing"`).
- No real progress reporting — the backend doesn't expose frame‑level progress, so the bar stays indeterminate.
