## What that corner artifact is

In the screenshot, the dark crescent in the top-left of the composer is the **drag‑highlight overlay leaking through the rounded corner**.

In `src/components/director/Composer.tsx` (lines 359–367) the dropzone wrapper is:

```tsx
<div className={`relative rounded-2xl bg-card ${highlight ? "ring-2 ring-accent bg-accent/5" : ""}`}>
  {highlight && (
    <div className="pointer-events-none absolute inset-0 ... rounded-2xl bg-accent/10">
      Drop here to attach
    </div>
  )}
  <textarea ... />
</div>
```

Two problems combine to make that dark notch:

1. The parent `<div>` uses `rounded-2xl` but does **not** clip its children (`overflow-hidden` is missing). The textarea (and the `bg-accent/10` highlight panel) are rectangular, so their square corners poke past the rounded mask of the parent.
2. The drag highlight is toggled by `dragenter` / `dragleave`. The session replay shows the user mousing over the composer (an attachment thumbnail/file got dragged), which flips `highlight` on briefly, then off — but the overlay's `bg-accent/10` against `bg-card` plus the square corner produces the visible darker arc in the top-left.

Even without the drag state, the same setup will show a faint square‑vs‑rounded mismatch any time the textarea has any background (focus ring, autofill, selection).

## Fix

Single-file, presentation-only change in `src/components/director/Composer.tsx` (the dropzone wrapper around line 359):

- Add `overflow-hidden` to the wrapper so every child is clipped to the `rounded-2xl` shape.
- Keep `rounded-2xl` on the highlight overlay as a defensive belt-and-braces (already there).
- No logic, no state, no other components touched.

Result: the corner stays a clean rounded curve in idle, hover, focus, and drag states.

## Verification

1. Open `/director/<session>` at 1119px width.
2. Confirm the composer's top corners are perfectly rounded with no dark crescent.
3. Drag a file over the composer — the "Drop here to attach" overlay should fill the rounded shape exactly, no square corners.
4. Focus the textarea and type — no square edge appears.
5. Check at mobile width (375px) and RTL — corners stay clean.
