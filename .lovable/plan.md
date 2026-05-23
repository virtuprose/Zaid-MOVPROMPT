## Goal

Unify all Marketing Studio popovers with the same visual language we just shipped for `BrandPickerPopover`:

- Rounded glass surface (`rounded-2xl`, `bg-[hsl(240_6%_7%)]/95`, `backdrop-blur-xl`, soft shadow, `border-border/60`).
- Uppercase tracked section header with right-aligned counter when applicable.
- Pill / rounded-lg thumbnails on item rows.
- Inline accent badge (Hero-style) for the primary/active item.
- Hover actions (edit/delete) docked in a floating chip absolutely positioned over the row — never pushing layout.
- "New …" footer row with dashed-tile plus icon matching the brand picker.

## Files to update

### 1. `src/components/marketing/CharacterPickerPopover.tsx`
Closest structural twin. Mirror BrandPickerPopover almost 1:1:
- Same `PopoverContent` classes and width (`w-[300px]`, glass surface, `sideOffset={8}`).
- Header "Your characters" with `count / max` counter.
- Item row: 9×9 rounded-lg avatar (photo or `User` icon fallback), name + subject sub-label, inline "Hero" pill on first selected, check icon docked absolute-right.
- Hover edit/delete moved into floating chip (absolute, opacity-0 → group-hover:opacity-100).
- Footer "New character" with dashed-tile plus icon.

### 2. `src/components/marketing/LocationPopover.tsx`
Larger content (search + suggestions + image upload), so only the surface + header chrome get re-skinned — internal sections stay intact:
- Replace `PopoverContent` classes with the unified glass surface.
- Wrap the title row in the uppercase tracked label style.
- Style preset/recent location rows with the same hover background (`hover:bg-white/[0.04]`), 9×9 rounded-lg thumbnails for any preview imagery, and matching typography.
- Keep all existing functionality (search input, upload zone, suggestions) — visual reskin only.

### 3. `src/components/marketing/RenderSettingsPopover.tsx`
Settings groups, no list items, so just align the shell:
- Same glass `PopoverContent` shell (rounded-2xl, blur, shadow, border-border/60).
- Section labels use the same uppercase `text-[10px] tracking-[0.18em] font-semibold text-muted-foreground/80` treatment.
- Group rows use `rounded-xl`, `hover:bg-white/[0.04]`, consistent padding (`px-2.5 py-2`).
- Active option gets the amber inset ring used by the brand picker (`ring-1 ring-inset ring-[#F5A524]/40 bg-[#F5A524]/10`) for visual consistency.

## Out of scope

- No behavior/logic changes, no prop changes.
- No edits to the actual sheets (`BrandKitSheet`, `CharacterKitSheet`) — only the popovers.
- No changes to `BrandPickerPopover` (already done) or to non-marketing popovers.

## Verification

After build, open `/marketing`, click each trigger (brand, character, location, render settings) and confirm they share: corner radius, blur, header label, hover state, and action-chip pattern.