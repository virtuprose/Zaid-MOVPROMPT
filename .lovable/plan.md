## Widen Director chat panel to the right

The chat area is currently capped at `max-w-3xl` (768px) inside a `max-w-7xl` container, leaving lots of empty space on the right.

**Change (single file: `src/pages/Director.tsx`):**
- Container line 194: `max-w-7xl` → `max-w-[1600px]`
- Chat wrapper line 308: `max-w-3xl w-full mx-auto lg:mx-0` → `w-full min-w-0` so it stretches to fill the right side of the grid track.

Sidebar (240px) and overall page padding stay the same. Result: the chat panel grows to the right while the left task list stays untouched.