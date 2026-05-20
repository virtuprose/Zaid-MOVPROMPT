# Fix: dropping a location does nothing

## Root cause
In `src/components/director/DirectorChat.tsx`, `handleLocationChoice` does:
```
setBubbles(... chosenIndex: index ...)   // React state update — async
void send(`Location chosen: ${index}`)   // runs immediately, still sees old state
```
Inside `send()` (line 828), the working array is built from the stale `bubbles` closure:
```
const cleaned = bubbles.filter(...)
```
So when the director responds with `request_story_render`, the lookup at line 1259 walks `next` and never finds a `location_picker` whose `chosenIndex` is set → falls through to **“Pick a location first, then I'll launch the acts.”**

That matches exactly what the screenshot shows.

## What I'll change
Only `src/components/director/DirectorChat.tsx`. No backend or UI changes.

1. Give `send()` an optional starting-bubbles snapshot:
   ```ts
   const send = async (textOverride?: string, bubblesOverride?: Bubble[]) => {
     ...
     const base = bubblesOverride ?? bubbles;
     const cleaned = base.filter((b) => b.role !== "error");
     ...
   }
   ```
2. In `handleLocationChoice`, build the updated array once, set it, and pass it into `send` so the request-story-render handler sees `chosenIndex`:
   ```ts
   const updated = bubbles.map((b, i) =>
     i === bubbleIndex && b.role === "location_picker" ? { ...b, chosenIndex: index } : b,
   );
   setBubbles(updated);
   void send(`Location chosen: ${index}`, updated);
   ```

## Expected result
- Drop or tap a location → the picker locks visually (already works).
- The director's follow-up `request_story_render` finds the chosen location, kicks off 4 parallel Seedance acts, and the ActStrip appears.
- No more “Pick a location first” loop.

## Validation
- Open an existing story session, pick aspect, generate the 7 locations.
- Drag or tap one → confirm the ActStrip with 4 rendering tiles appears.
- Check edge-function network tab for a `story-render` call right after `Location chosen: N`.
