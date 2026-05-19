## Changes to `src/components/director/GeneratedImageCard.tsx`

**1. Center the expand button**
- Move the `Maximize2` button from `top-1 right-1` to centered: `absolute inset-0 flex items-center justify-center`.
- Increase tap target (e.g. `p-2`, `h-5 w-5` icon) and keep the `opacity-0 group-hover:opacity-100` reveal.
- Wrap the icon in a circular `bg-background/85` chip so it reads as a clear affordance over any image.
- The Redo button (bottom-right) and panel number badge (top-left) stay where they are.

**2. Lightbox navigation between images**
- Change `zoomUrl` state to `zoomIndex: number | null`.
- Clicking expand on image `i` opens the dialog at that index.
- Inside `<DialogContent>`, render the current image (`data.images[zoomIndex]`) plus two arrow buttons (`ChevronLeft` / `ChevronRight` from lucide):
  - Positioned `absolute left-2 / right-2 top-1/2 -translate-y-1/2`.
  - Only rendered when `data.images.length > 1` (so single key-frame stays clean).
  - Wrap-around: `prev = (i - 1 + n) % n`, `next = (i + 1) % n`.
- Add keyboard support: a `useEffect` listens for `ArrowLeft` / `ArrowRight` while the dialog is open and advances `zoomIndex`.
- Show a small counter chip (e.g. `2 / 8`) at the bottom center when there are multiple images.

**Out of scope:** swipe gestures, thumbnail strip, changes to other bubbles or the agent flow.