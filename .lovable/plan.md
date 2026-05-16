## Goal

Restyle the empty-state Product/Avatar tiles next to Generate to match the reference: a small "+" badge in the top-left corner and the label ("PRODUCT" / "AVATAR") rendered as bold white text in the bottom-left — no full-width black overlay bar, no centered icon.

## Changes — `src/pages/MarketingStudio.tsx` (brand + character tiles only)

When **no brand is selected** (`!brandKit?.logo_url`):
- Tile stays `w-14 h-14 rounded-2xl` with `border border-white/10 bg-white/5`.
- Replace centered `Building2` icon with:
  - Top-left: 18×18 `rounded-full border border-white/30` containing a `Plus` icon (`w-3 h-3`), positioned `absolute top-1 left-1`.
  - Bottom-left: `<span>` with text `PRODUCT` / `APP` (driven by `subject`), `absolute bottom-1 left-1.5`, `text-[9px] font-bold tracking-wider uppercase text-white`.
- Remove the full-width black `bg-black/60` bottom bar in the empty state.

When **no character is selected** (`!characterKit?.reference_url`):
- Same structure as above, label = `AVATAR`.

When a brand/character **is** selected:
- Keep current behavior unchanged — image fills tile, black overlay bar with label at bottom (matches the filled state).

## Out of scope

- Generate button styling (pink gradient + credit count "90 75" in screenshot). User only asked about the empty Product/Avatar tiles.
- Sidebar Product/App buttons.
- No logic changes — pickers and click behavior remain identical.
