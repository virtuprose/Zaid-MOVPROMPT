## Goal

Allow attaching **multiple brands/products** and **multiple characters** to a single ad in Marketing Studio (today: exactly one of each). Caps: **up to 2 products** and **up to 3 characters** per ad — enough for real scenarios (duo, family, hero + supporting product) without breaking 5s ad coherence or identity fidelity.

## UX

**Brands/Products row** and **Characters row**:
- Card click toggles selection (add/remove from the active set), not single-replace.
- Selected cards show the existing check badge; ordering reflects selection order (first picked = primary/hero).
- When a cap is reached, unselected cards become disabled with a subtle tooltip ("Up to 2 products" / "Up to 3 characters"). Clicking a selected card always deselects.
- Tiny "Primary" pill on the first selected card so the user understands which one is the hero.
- Header counter updates: `2 / 2 selected`, `1 / 3 selected`.

No new sheets, no reordering UI in this pass — selection order = primary. Drag-to-reorder can come later if asked.

## Behavior in the prompt

- `composeStudioPrompt` and `writeAdScene` switch from a single `brand`/`character` to arrays. First item is hero, the rest are supporting.
- Prompt phrasing:
  - 1 product → unchanged ("feature it cleanly in-hand…").
  - 2 products → "Hero product: {A}. Supporting product also visible in the same frame: {B}. Keep {A} as the clear focal point in the final hero frame."
  - 1 character → unchanged.
  - 2–3 characters → "On-camera: {A} (primary), with {B}[, {C}]. They share the frame naturally; {A} leads the action."
- Image refs (`brand`, `character`, `location`) become indexed (`brand_1`, `brand_2`, `character_1`…) so the video model can match each face/logo. Same refTag pattern, just numbered.
- Edge function `write-ad-scene` system prompt gets one extra rule: "If multiple products or characters are provided, the first is the hero; others are supporting and must share the frame without stealing focus."

## Persistence

- Replace the single-row tables `brand_kit_selection` / `character_kit_selection` (one row per user, one id) with multi-row selections: `(user_id, kit_id, position)` with a unique `(user_id, kit_id)` and `position` for ordering. RLS: user can CRUD only their own rows.
- `useBrandKit` / `useCharacterKit` expose `activeIds: string[]`, `activeKits: Kit[]`, `toggleActive(id)`, plus `MAX` constants (`2` / `3`). `activeKit` / `activeId` stay as derived `activeKits[0]` / `activeIds[0]` so nothing else breaks during the transition.

## Files touched

- `src/lib/marketing/brandKit.ts`, `src/lib/marketing/characterKit.ts` — multi-select state, toggle, cap, persistence.
- `src/components/marketing/BrandsRow.tsx`, `src/components/marketing/CharactersRow.tsx` — accept `activeIds: string[]`, `max`, render primary pill + disabled state.
- `src/pages/MarketingStudio.tsx` — pass arrays into composer; toggle-based onSelect.
- `src/lib/marketingStudio.ts` — `StudioBrief.brand`/`character` become arrays; `brandLine` / `characterLine` handle hero + supporting; indexed `imageRefs`.
- `src/lib/director/api.ts` (`writeAdScene`) — send arrays.
- `supabase/functions/write-ad-scene/index.ts` — accept arrays, add hero/supporting rule.
- Migration: new `brand_kit_selections` / `character_kit_selections` tables + RLS; one-time copy from old single-row tables; drop old tables after.

## Out of scope

- Drag-to-reorder selected items (selection order = primary for now).
- Per-character role overrides at attach-time.
- Smart "two products don't make sense for this Format" warnings — we'll see if it's needed once shipped.
