
## Add "New Preset" creation from Previews section

Add a button in the admin **Preset Previews** header that opens a dialog to create a brand-new preset (id, label, group, icon, description, best-for, animation class). New presets are persisted and merged into the existing preset list so they show up both in the admin grid (for video upload) and on the main page.

### What changes

**1. New table `custom_presets`** (migration)
Columns: `id text pk`, `label text`, `group_id text`, `icon_name text` (lucide icon name), `description text`, `best_for text`, `anim_class text nullable`, `created_at timestamptz default now()`, `created_by uuid`.
- RLS: public `select` (so main page can read), `insert/update/delete` restricted to admins via existing `has_role(auth.uid(),'admin')`.

**2. `src/lib/presets.ts`**
- Keep built-in `PRESETS` as-is.
- Export a new async loader `loadCustomPresets()` that fetches from `custom_presets` and maps `icon_name` → lucide component via a small whitelist map (Camera, Film, Sparkles, Zap, Wand2, Aperture, Move, RotateCw, ZoomIn, etc. — ~20 common ones).
- Export `getAllPresets()` returning built-ins + customs, and `useAllPresets()` hook (React Query) for components.

**3. `src/components/admin/PresetPreviewsSection.tsx`**
- Add a **"New Preset"** button (Plus icon) in the card header next to the bulk-generate button.
- Clicking opens a `Dialog` with a form: ID (slug, auto-generated from label, validated unique), Label, Group (Select from `PRESET_GROUPS`), Icon (Select from whitelist with live preview), Description, Best for, Animation class (optional, free text).
- On submit: insert into `custom_presets`, refresh the list so the new preset appears in its group's grid, ready for MP4 upload.
- Custom presets show a small "Custom" badge (like the existing "Hero" badge) and gain a delete-preset action (trash on the card header area, separate from the video delete).

**4. Main page consumers (`Index.tsx` / wherever `PRESETS` is iterated)**
- Switch from importing `PRESETS` directly to `useAllPresets()` so customs render alongside built-ins with the same hover-video behavior.

### Out of scope
- Editing existing built-in presets (still code-defined).
- Bulk auto-generate for custom presets (upload-only, same as non-hero built-ins).
- Custom icon upload — icon picker is limited to the lucide whitelist.

### Files touched
- `supabase/migrations/<new>.sql` (new `custom_presets` table + RLS)
- `src/lib/presets.ts`
- `src/components/admin/PresetPreviewsSection.tsx`
- `src/pages/Index.tsx` (and any other file iterating `PRESETS` for display)
