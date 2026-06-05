# Director Activity — Sequential Typing & Reveal

Make the activity panel feel like a live operator console: each step types itself in character-by-character while running, and the next step only appears once the previous one is done (or fails).

## Behavior

1. **Sequential reveal.** Render steps one at a time in order. A step is mounted only after the previous step's status is `done` or `failed`. Each new row enters with a soft fade + slide-up (≈220ms).
2. **Per-step typing.** While a step is `running`, its label types out left-to-right (~22ms/char, capped so long labels finish in ≤900ms) with a blinking caret at the end. Once `done`/`failed`, the full label snaps in and the caret disappears.
3. **Status icon transitions.** Spinner while running → check (done) or amber triangle (failed) with a 150ms scale-in pop. The leading status dot in the header pulses while any step is running.
4. **Footer caption.** Keep the rotating caption line, but tie its fade transition to the current running step changing (fade-out 120ms / fade-in 180ms) so it feels handed off between operations.
5. **Reduced motion.** Respect `prefers-reduced-motion`: skip typing + reveal stagger, render steps immediately with no caret.
6. **Replay safety.** When the component remounts mid-stream (e.g. session hydration where steps already arrive `done`), do NOT replay typing for already-completed steps — only animate the row currently `running` and any subsequent arrivals. Track which step ids have already been "seen" in a ref.

## Files

- `src/components/director/DirectorActivityFeed.tsx` — only file touched.
  - Add a small `useTypewriter(text, enabled)` hook (inline) that returns the progressively revealed substring + a `done` flag.
  - Add a `seenIdsRef` + `useEffect` that records ids the first time each step is observed; rows whose id was first observed in a non-running state skip the typing animation.
  - Derive `visibleSteps`: include every step up to and including the first still-running step; trailing not-yet-started steps stay hidden.
  - Wrap each `<li>` in a `motion-safe:animate-fade-up` with a tiny CSS `animation-delay` for natural stagger; render the label via the typewriter output plus a `<span className="caret">` that uses an existing/added pulse keyframe.
  - Add a `.caret` blink (1s steps-2 infinite) — define inline via Tailwind arbitrary `animate-[blink_1s_steps(2)_infinite]` (no tailwind.config change needed) and a `@keyframes blink` in `src/index.css` if not already present.

## Out of scope

- No changes to how steps are produced upstream (`director-agent`, orchestrator, DirectorChat). The event stream already arrives incrementally; we just present it more cinematically.
- No new dependencies (no framer-motion add). Pure CSS + a tiny hook.
- No design-token or color changes.

## QA checklist

- Fresh run: steps appear one-by-one, each typing, next only after prior completes.
- Mid-session reload with all steps already `done`: list renders instantly, no typing replay, footer caption hidden or static.
- Failure mid-stream: failed step stops typing, shows amber icon, subsequent step still reveals.
- `prefers-reduced-motion: reduce`: no typing, no caret, no stagger.
