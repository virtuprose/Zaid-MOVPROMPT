## Goal

Unify every popover and dropdown across the entire app to match the BrandPickerPopover surface — without touching every call site. Do this by upgrading the two shadcn primitives so the default chrome IS the unified design.

## Approach

Change the default classes on `PopoverContent`, `DropdownMenuContent`, and `DropdownMenuSubContent` so they ship with:

- `rounded-2xl` (was `rounded-md`)
- `border-border/60`
- `bg-popover/95 backdrop-blur-xl` (token-themed so light mode still works)
- `shadow-2xl shadow-black/40` (was `shadow-md`)
- `p-1.5` defaults for menus so items breathe

Update `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuSubTrigger` to:

- `rounded-lg` instead of `rounded-sm`
- `px-2.5 py-2` for consistent breathing room
- `focus:bg-accent/40 focus:text-foreground` (subtler than full accent, matches the brand-picker `hover:bg-white/[0.04]` feel via tokens so light-mode still reads)

These edits live in two files:

- `src/components/ui/popover.tsx`
- `src/components/ui/dropdown-menu.tsx`

## Compatibility

- Existing callers that pass their own className still override (Tailwind merge order is preserved).
- The four marketing popovers that already pin explicit glass classes (`bg-[hsl(240_6%_7%)]/95`, custom widths) keep working — their classes win.
- Light mode keeps working because we use `bg-popover` (already token-driven) plus blur/shadow on top.

## Out of scope

- No edits to individual call sites (TopNav, NotificationBell, Library, Director, ResultsPanel, MentionTextarea, etc.). The primitive upgrade flows through.
- No changes to behavior, no prop changes, no new exports.
- No changes to the marketing popovers we just shipped.

## Verification

After build: open TopNav account dropdown, NotificationBell, ModelPicker dropdowns, Library row menus, and Director popovers — all should share the same rounded glass surface, soft shadow, and item padding.