

## Plan — Real video previews for hero presets

Upgrade a curated set of "hero" presets from animated icons to short looping video clips hosted on Lovable Cloud Storage. Animated-icon fallback stays for the other ~100 presets and for any clip that fails to load.

### Scope: which presets get real videos

Start with **12 hero presets** that benefit most from motion (icons can't convey them well):

`dolly-zoom`, `bullet-time`, `orbit-360`, `crash-zoom-in`, `whip-pan-right`, `fpv-drone`, `levitation`, `explosion`, `disintegration`, `glitch`, `lightning`, `bullet-slow` (mix).

Adding more later = drop a file in storage + add one row to the registry. No code change.

### Where the videos live

New **public** Supabase Storage bucket: `preset-previews`.
- Path convention: `preset-previews/<preset-id>.mp4` (e.g. `preset-previews/dolly-zoom.mp4`)
- Public URL pattern: `${SUPABASE_URL}/storage/v1/object/public/preset-previews/<id>.mp4`
- Format: MP4 (H.264), 480×320, ~1.5s loop, muted, ≤150KB each. Optional `<id>.webm` sibling for smaller payload.

Created via SQL migration. RLS: public read, no public write (uploads via admin only).

### Sourcing the clips

Two options for how clips get into the bucket — pick one:

**A. You upload them** (recommended, fastest, best quality)
I add an admin-only "Preset Previews" tile in `/admin` with a drag-drop uploader keyed by preset id. You drop 12 MP4s, they go straight to the bucket. No AI cost.

**B. AI-generated stills** (no upload work, lower fidelity)
A one-time edge function `seed-preset-previews` calls `gemini-3-flash-image-preview` to render a representative still per preset, saves PNG to the bucket. Stills loop with a subtle CSS Ken Burns. Good enough for "what does this look like" but not true motion.

I'll implement **A** unless you say otherwise — it's the only path that gives real motion (the whole point of the upgrade).

### Code changes

**`src/lib/presets.ts`**
- Add optional `previewVideo?: string` field on `Preset`.
- Add `PRESETS_WITH_VIDEO: Set<string>` containing the 12 hero IDs above.
- Helper `getPresetVideoUrl(id)` → builds the public URL from `VITE_SUPABASE_URL` if the id is in the set, else `null`.

**`src/components/PresetCard.tsx`**
- If `getPresetVideoUrl(id)` returns a URL: render a `<video muted loop playsInline preload="metadata">` filling the icon area. Plays on hover (desktop) and always inside the HoverCard preview.
- On `error` event: swap back to the animated icon (graceful fallback).
- Keep the icon as a poster/placeholder while the video buffers.
- HoverCard: bigger 320px video preview + same description/best-for.

**`src/components/admin/PresetPreviewsSection.tsx`** *(new, only if option A)*
- Grid of the 12 hero presets, each with current preview thumb + upload button. Uploads to `preset-previews/<id>.mp4` via Supabase JS, replacing on conflict. Shows file size + last-modified.

**`src/pages/Analytics.tsx`** (admin shell) — add the new section card.

### Migration

```sql
insert into storage.buckets (id, name, public)
values ('preset-previews', 'preset-previews', true)
on conflict (id) do nothing;

create policy "Public read preset previews"
on storage.objects for select
using (bucket_id = 'preset-previews');

create policy "Admins upload preset previews"
on storage.objects for insert to authenticated
with check (bucket_id = 'preset-previews' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update preset previews"
on storage.objects for update to authenticated
using (bucket_id = 'preset-previews' and public.has_role(auth.uid(), 'admin'));
```

### Behavior preserved
- Presets without a video keep their current animated-icon look exactly.
- Click-to-add-to-prompt is unchanged.
- Search, tabs, RTL, mobile grid — all unchanged.
- Bandwidth: video only loads (`preload="metadata"`) when card is visible/hovered, so cold-start cost is tiny.

### Verification
- Hover Dolly Zoom card → real video clip plays in the card and in the larger hover preview.
- Hover any non-hero preset (e.g. "Pan Left") → animated icon plays as before.
- Disconnect network → all cards fall back to animated icons cleanly.
- Admin → "Preset Previews" section → upload an MP4 for `lightning` → reload main app, hovering Lightning shows the new clip.
- Mobile: tap-and-hold a hero card → video plays in the popover.

