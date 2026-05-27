## Problem

Two "Analyze Scene" buttons stack on screen once an image is uploaded:

1. The **inline button** rendered under "Replace image" (part of `ctaRowBlock` in `WorkflowPanel.tsx`).
2. The **sticky bottom-bar button** I made visible on desktop in fix #1.

Both fire the same action, so users see them as a confusing duplicate.

## Fix

In `src/components/WorkflowPanel.tsx`, hide the inline `ctaRowBlock` Analyze button **once an image is uploaded** (i.e. when the sticky CTA takes over).

- When `hasRequiredImages` is false → keep the inline button so it can show the disabled "Upload an image to continue" affordance next to the upload tile.
- When `hasRequiredImages` is true → suppress the inline Analyze button entirely; the sticky bottom bar already shows Analyze Scene + the "Free — no credits" line + the "Skip & Generate Now" link can move with it.

Also move the **"Skip & Generate Now"** link into the sticky bar (right under Analyze) so the user still has both options in one place instead of orphaned mid-screen.

No backend, no copy, no other UX changes.
