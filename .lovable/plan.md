## Add a "Character" library to Ads Studio

Add a new saved-Character feature alongside "Your brands" so users can save their custom character references (a portrait photo + name + short description) once and reuse them on every ad.

### UX

In `MarketingStudio` (route `/marketing`), right under the existing **Your brands** row, render a new **Your characters** row with the same layout & styling as `BrandsRow`:

- Empty state: full-width dashed tile "Add your first character — we'll reuse this person on every ad."
- Populated state: horizontal scrolling list of 200×84 tiles (portrait thumb + name + role/description preview), an active tile shows the amber check, hover reveals Edit / Delete, and a trailing dashed "New character" tile.
- Selecting a tile sets it as the active character; clicking the active tile again deselects.

When a character is active, a small chip appears in the composer header next to the brand chip (avatar + name + ✕ to clear), matching the existing brand chip pattern at lines 317–340.

### Data model

New table `character_kits` (mirrors `brand_kits`):

```text
character_kits
  id              uuid pk
  user_id         uuid not null
  name            text not null default ''
  description     text not null default ''   -- "30yo barista, short curly hair, warm smile"
  role            text                       -- optional ("Founder", "Customer", "Talent")
  reference_path  text                       -- storage path in director-uploads
  created_at      timestamptz default now()
  updated_at      timestamptz default now()
```

New table `character_kit_selection` (mirrors `brand_kit_selection`, one row per user) tracks the active character.

RLS: same per-user policies already used by `brand_kits` / `brand_kit_selection` (select/insert/update/delete where `auth.uid() = user_id`).

Reference images go to the existing private `director-uploads` bucket under `marketing/{user_id}/character/ref-{ts}.{ext}` and are read via 1-hour signed URLs (same pattern as `signLogo`).

### Code structure

- `src/lib/marketing/characterKit.ts` — `CharacterKit` type, `EMPTY_CHARACTER_KIT`, `useCharacterKit()` hook (list / save / delete / setActive / uploadReference / signed-URL helper). Modeled directly on `useBrandKit`.
- `src/components/marketing/CharactersRow.tsx` — visual twin of `BrandsRow` but with `UserRound` icon and "Your characters" header.
- `src/components/marketing/CharacterKitSheet.tsx` — slide-over editor (name, role, description, reference image upload + preview, Save / Delete). Lean version of `BrandKitSheet` — no brand-image-analysis call needed initially.
- `src/pages/MarketingStudio.tsx`:
  - Mount `useCharacterKit()` alongside `useBrandKit()`.
  - Render `<CharactersRow>` right after `<BrandsRow>` (line 313).
  - Add the character chip to the composer header (line 318 block).
  - Pass character into the prompt brief.
- `src/lib/marketingStudio.ts`:
  - Add `CharacterContext { name; description?; role?; hasImage?: boolean }` and a `characterLine()` helper.
  - Extend `StudioBrief` with `character?: CharacterContext` and include `characterLine(brief.character)` in the composed prompt (placed right after `brandLine`).
- Send the character reference image to the video job the same way the location reference image is sent today, so the generator can match the person.

### Out of scope

- No new edge function (analysis of the character photo can be added later).
- No changes to Director / non-marketing surfaces.
- No changes to existing brand UI beyond placing the new row beneath it.
