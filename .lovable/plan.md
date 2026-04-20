
## Plan — Fix missing model descriptions on hover

### Root cause
Wrapping a Radix `SelectItem` with a Radix `Tooltip` doesn't work reliably. The Select component manages its own pointer/focus events for keyboard navigation and row highlighting, which swallows the hover events the Tooltip needs to open. That's why pointing at a model shows nothing. The info-icon popover still works because it's triggered by click, not hover.

### Fix — show descriptions inline, always visible
Instead of fighting Radix, put the description **directly inside each row** as a small muted second line under the model name. This is:

- Always visible — no hover needed, zero discoverability problem
- Keyboard/screen-reader friendly out of the box
- Works identically on desktop and mobile
- Matches how high-end pickers (Linear, Raycast, Vercel) present option metadata

The info icon and its popover are removed (redundant now). The tooltip wrapper is removed (it was the source of the bug).

### Layout per row
```
Kling 3.0
Top cinematic motion & realism. Best for hero shots and dramatic action.
```
- Label: current weight, truncates if needed.
- Description: `text-xs text-muted-foreground`, clamped to 2 lines (`line-clamp-2`), full width.
- Selected row keeps existing check indicator; spacing tightened so the dropdown doesn't feel tall.
- `SelectContent` `max-h` bumped slightly (from `max-h-80` to `max-h-[420px]`) so more rows remain visible with the taller items.
- "Any Model" row keeps its bolder label and gets the same description treatment.

### RTL
Works unchanged — the row content is a simple flex column, so Tailwind/`dir="rtl"` flips it correctly without extra CSS.

### Files touched
- `src/components/ModelPicker.tsx` — simplify `ModelRow`: remove `Tooltip`, `Popover`, `Info` icon, and the related state/handlers. Render label + description stacked inside each `SelectItem`. Remove the now-unused `TooltipProvider` wrapper. Adjust `SelectContent` `max-h`.

No other files change. No translations change (keys `models.desc.*` are reused as-is). No backend change.

### Verification
- Open the model dropdown → every row shows its description beneath its name, in both EN and AR.
- Keyboard arrow-through reads label + description.
- Selecting a row still works exactly as before and closes the dropdown.
