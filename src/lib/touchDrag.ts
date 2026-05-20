// Shared tuned constants and helpers for touch drag interactions.

export const LONG_PRESS_MS = 180;
export const MOVE_CANCEL_PX = 10;
export const SNAP_DISTANCE_PX = 24;
export const HAPTIC_MS = 12;

export const triggerHaptic = (ms = HAPTIC_MS) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }
};

/**
 * Find the nearest drop target at the given client point. Walks elementsFromPoint
 * for any ancestor matching `selector` (a data-attribute selector). If the nearest
 * candidate's center is within SNAP_DISTANCE_PX, returns it as snapped.
 */
export function findDropTargetFromPoint(
  x: number,
  y: number,
  selector: string,
): { element: HTMLElement; id: string | null; snapped: boolean } | null {
  if (typeof document === "undefined") return null;
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    const el = (node as HTMLElement).closest?.(selector) as HTMLElement | null;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    const id = el.getAttribute("data-drop-id");
    return { element: el, id, snapped: dist <= SNAP_DISTANCE_PX };
  }
  return null;
}
