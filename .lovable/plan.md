## Goal

Restyle the brand + character pickers inside the composer card on `/marketing` to match the reference: a compact pill row at the top-left with a leading **`+`** add button, followed by small dark pills (avatar + name + `×` to detach).

## Change

In `src/pages/MarketingStudio.tsx`, replace the current top row of large `BrandPickerPopover` / `CharacterPickerPopover` triggers (lines ~321–419) with a tighter row:

```
[ + ]   [ 👤 Stefan × ]   [ 🟨 Haribo can… × ]
```

- **`+` button** — 36×36, `rounded-xl`, dashed/solid border, dark `bg-secondary/40`. Opens a small dropdown menu with two items: **Add brand** and **Add character**. Each opens the existing `BrandPickerPopover` / `CharacterPickerPopover` (kept off-screen, anchored to the menu items via `Popover` controlled state) — OR simpler: clicking each item opens the existing kit sheet directly (`setBrandOpen(true)` / `setCharacterOpen(true)`) for the "new" flow, and the pills themselves act as the picker triggers for switching among saved kits.
- **Pill style** — `h-9 pl-1 pr-2 rounded-xl bg-[hsl(240_5%_12%)] border border-white/10`, 24×24 rounded avatar (logo or character ref), name truncated `max-w-[120px]`, `×` icon at right that detaches (calls `setBrandActive(null)` / `setCharacterActive(null)`).
- **Pill click** — opens the corresponding `BrandPickerPopover` / `CharacterPickerPopover` so the user can switch between saved kits or edit. Popover trigger wraps the entire pill.
- **When nothing selected** — show only the `+` button (no empty pills).
- Outer container shrinks: `flex items-center gap-2 mb-3 pb-3 border-b border-border/30` (smaller bottom padding to match the tighter reference).

Behavior, state, edit/delete callbacks, and the existing `BrandKitSheet` / `CharacterKitSheet` flows stay unchanged.

## Out of scope

- The floating character thumbnail card and PRODUCT/AVATAR preview cards next to the Generate button in the screenshot are NOT part of this change (would be a separate task).
- No business logic changes.

## Files

- `src/pages/MarketingStudio.tsx` — only the brand+character row markup and a small `DropdownMenu` for the `+` button.
