# Pause "Your recent ads" until hover

In `src/pages/MarketingStudio.tsx`, the `UserAdCard` video (around lines 1212–1221) currently `autoPlay`s. Change it so each video sits paused on its first frame and only plays while the mouse is over the card.

## What changes

`UserAdCard` only:

- Add `const videoRef = useRef<HTMLVideoElement>(null)`.
- Remove `autoPlay`; keep `muted loop playsInline`; add `preload="metadata"` so the first frame renders as a still poster.
- On the wrapping `<article>`, add `onMouseEnter` → `videoRef.current?.play().catch(() => {})` and `onMouseLeave` → pause + reset `currentTime = 0`.
- Also wire `onFocus`/`onBlur` to the same handlers for keyboard users.

No changes to data, the lightbox, pending cards, or community grid.
