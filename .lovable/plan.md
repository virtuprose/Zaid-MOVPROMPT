## Save multiple brand kits per user (Products & Apps library)

Today each user has exactly one brand kit. Switch to a **library**: many named brands per user, each marked as Product or App, reusable across every Ads Studio session and any future preset that needs brand context.

### Data model

Migrate `brand_kits` from one-row-per-user to many-rows-per-user.

- Add `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- Drop the implicit single-row constraint on `user_id`; keep it as `NOT NULL` with an index
- Keep existing columns: `subject`, `name`, `description`, `tagline`, `url`, `audience`, `logo_path`, timestamps
- RLS policies stay the same (own-row CRUD)

Add a `brand_kit_selection` table to remember which brand the user last used in Ads Studio:
- `user_id uuid PK` → `brand_kit_id uuid` (nullable, FK with `ON DELETE SET NULL`)
- Own-row RLS

### `useBrandKit` hook (rewritten)

Returns:
- `kits: BrandKit[]` — all of the user's saved brands
- `activeKit: BrandKit | null` — the currently selected one (from selection table, falls back to most recently updated)
- `setActive(id)` — persists selection
- `saveKit(draft)` — insert if no `id`, update if `id` exists; auto-selects the saved kit
- `deleteKit(id)`
- `uploadLogo(file)` — unchanged

### Ads Studio composer — Brand chip becomes a picker

Replace the single "Brand" button with a popover:

```
┌─ Your brands ──────────────────┐
│ ✓ Acme Sneakers      [Product] │
│   Sleepy App          [App]    │
│   Foo Coffee          [Product]│
├────────────────────────────────┤
│ + New brand                    │
│ ✎ Edit selected                │
└────────────────────────────────┘
```

- Each row shows logo thumb, name, subject pill (red-tint border for active).
- Selecting a row sets it active for the next generation.
- "+ New brand" opens `BrandKitSheet` blank.
- "✎ Edit selected" opens `BrandKitSheet` pre-filled.
- Auto-fill from logo upload still works (already implemented).

### `BrandKitSheet` updates

- Accept optional `kitId` prop. When set, edit that row; when null, create new.
- Add a small "Delete" button (ghost, danger color) when editing existing.
- After save, the picker reflects the new/updated kit and selects it.

### Generation wiring

`composeStudioPrompt` still receives a single `BrandContext` — no changes to prompt code. The Studio just feeds it from `activeKit` instead of the previous singleton.

### Files

- migration: schema change + new `brand_kit_selection` table
- edit: `src/lib/marketing/brandKit.ts` — list + active + CRUD
- new: `src/components/marketing/BrandPickerPopover.tsx`
- edit: `src/components/marketing/BrandKitSheet.tsx` — accept `kitId`, add delete
- edit: `src/pages/MarketingStudio.tsx` — swap Brand button for the picker

### Out of scope

- No changes to Location, Format, Hook, Setting.
- No sharing/teams — kits stay private per user.
- No brand-asset library (extra logos, color tokens) — single logo per kit, same as today.
