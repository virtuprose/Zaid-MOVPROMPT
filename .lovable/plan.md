# Move Product & Avatar into the textarea composer

Treat Product and Avatar as part of "describe what happens in the ad" — they live inside the composer textarea zone, not as separate right-side buttons.

## Layout change in `src/pages/MarketingStudio.tsx`

Composer card becomes:

```text
┌─ Composer card ──────────────────────────────────┐
│  [+ Product]  [+ Avatar]   ← inline add buttons │
│  (or filled chip with thumb + name + ✕)         │
│                                                  │
│  Describe what happens in the ad…               │
│  (textarea, borderless, grows)                  │
│                                                  │
│  ──────────────────────────────────────────     │
│  [Format] [Location] [Render]      [Generate]   │
└──────────────────────────────────────────────────┘
```

## Specific edits

1. **Remove** the top conditional chip strip (lines 563–632) that only renders when something is attached.
2. **Remove** the right-side 12×12 `BrandPickerPopover` and `CharacterPickerPopover` preview buttons (lines 688–754). `Generate` stays on the right, alone.
3. **Add** a new always-visible row directly above the `<Textarea>` (before line 634):
   - **Product slot**: if `brandKit` → chip with logo thumb + name + ✕ (detaches). If empty → `BrandPickerPopover` trigger styled as a dashed `+ Product` pill.
   - **Avatar slot**: same pattern with `characterKit` / `CharacterPickerPopover` → `+ Avatar` pill.
   - Both open the existing popovers (kits list, new, edit, delete) — no picker logic changes.
4. **Keep** Location attachment chip behavior — but since Location already has its own bottom-row `PresetChip`, drop the top Location chip entirely (it was duplicative). The bottom `Location` chip continues to show "Scene · Ref image" state.
5. Bottom chip row stays: `Format`, `Location`, `Render`, then `ml-auto` `Generate`.

## Visual spec for the inline slots

- Empty state: `h-9 px-2.5 rounded-xl border border-dashed border-border/60 bg-secondary/30 text-xs text-muted-foreground hover:border-[#F5A524]/50 hover:text-foreground`, icon (`Building2` / `UserRound`) + `+ Product` / `+ Avatar`.
- Filled state: reuse the existing `h-9 pl-1 pr-1.5 rounded-xl border border-[#F5A524]/40 bg-[#F5A524]/10` chip with 7×7 thumb, name (truncate 160px), ✕ detach.
- Row: `flex flex-wrap items-center gap-2 mb-3`.

## Out of scope

- No changes to BrandPickerPopover / CharacterPickerPopover internals.
- No DB / edge-function / prompt-generation changes — `brandKit` & `characterKit` are still attached the same way and flow into generation unchanged.
- Location attachment popover / scene picker untouched.
